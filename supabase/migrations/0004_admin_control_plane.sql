-- FUT Forge Admin Control Plane: role/tier/entitlement-override foundation.
--
-- Model (kept deliberately separate, per product decision):
--   ROLE  (USER | ADMIN)     -> administrative privilege, nothing to do with the product tier.
--   TIER  (FREE | PREMIUM)   -> product plan. Both currently unlock every feature - there is no
--                               paywall yet, this only prepares the matrix for when one exists.
--   ENTITLEMENT OVERRIDE     -> optional per-user, per-feature exception (ENABLED/DISABLED) that
--                               wins over the tier default. Resolution order: individual override,
--                               then tier default, then deny.
--
-- Deliberately does NOT touch the existing `plan`/`plan_expires_at` columns on `profiles` - those
-- remain exactly as Desktop (futforge_auth.py / futforge_auth.js's loadProfile/effectivePlan)
-- already reads/writes them. `role`/`tier` are new, additive columns; nothing here can change
-- what Desktop or the Chrome extension already do.
--
-- Idempotent: safe to run once; re-running is a no-op (IF NOT EXISTS / OR REPLACE / DROP+CREATE
-- for policies and functions throughout).

-- 1) profiles: add role/tier/updated_at -----------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'USER',
  add column if not exists tier text not null default 'FREE',
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles add constraint profiles_role_check check (role in ('USER', 'ADMIN'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_tier_check'
  ) then
    alter table public.profiles add constraint profiles_tier_check check (tier in ('FREE', 'PREMIUM'));
  end if;
end $$;

-- Backfill: every profiles row that pre-dates this migration already defaulted to USER/FREE via
-- the column defaults above. This only needs to backfill users who registered (auth.users exists)
-- but have never triggered profiles-row creation (e.g. site-only signups that never opened
-- Desktop/Browser Mode) - so the admin users list can see them too.
insert into public.profiles (id, email, username, role, tier, created_at, updated_at)
select u.id, u.email, u.raw_user_meta_data ->> 'username', 'USER', 'FREE', u.created_at, now()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- 2) Auto-provision profiles row (role=USER, tier=FREE) on every new signup, any channel -----
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, role, tier, created_at, updated_at)
  values (new.id, new.email, new.raw_user_meta_data ->> 'username', 'USER', 'FREE', now(), now())
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile_defaults on auth.users;
create trigger on_auth_user_created_profile_defaults
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- 3) is_admin() helper - SECURITY DEFINER so it can read profiles.role from inside profiles'
--    own RLS policies without recursing into RLS itself. -----------------------------------
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select role = 'ADMIN' from public.profiles where id = uid), false);
$$;

-- 4) entitlement_overrides: per-user, per-feature exception ----------------------------------
create table if not exists public.entitlement_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature_id text not null,
  enabled boolean not null, -- true = ENABLED override, false = DISABLED override
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, feature_id)
);
alter table public.entitlement_overrides enable row level security;

drop policy if exists entitlement_overrides_select on public.entitlement_overrides;
create policy entitlement_overrides_select on public.entitlement_overrides
  for select using (auth.uid() = user_id or public.is_admin());
-- No insert/update/delete policy for regular clients - only admin_set_entitlement_override()
-- below (SECURITY DEFINER) can write, after checking is_admin() itself.

-- 5) admin_audit_log: minimal audit trail for admin mutations --------------------------------
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  target_id uuid not null references public.profiles(id),
  action text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;

drop policy if exists admin_audit_log_select on public.admin_audit_log;
create policy admin_audit_log_select on public.admin_audit_log
  for select using (public.is_admin());
-- No client insert/update/delete policy - only the RPCs below write, as SECURITY DEFINER.

-- 6) profiles RLS: let admins read every row (existing self-select policy, whatever its name,
--    is untouched - this is an additional, additive permissive policy) ----------------------
drop policy if exists profiles_admin_select_all on public.profiles;
create policy profiles_admin_select_all on public.profiles
  for select using (public.is_admin());

-- 7) Admin RPCs - every one re-checks is_admin() internally, so the anon key + a regular
--    session JWT is sufficient; no service-role key is used or required anywhere. Each is also
--    explicitly revoked from PUBLIC/anon (defense in depth - even if it weren't, an anon caller
--    has auth.uid() = null, so is_admin() already returns false and the call would fail). ------

create or replace function public.admin_list_users(
  p_search text default null,
  p_role text default null,
  p_tier text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  email text,
  username text,
  role text,
  tier text,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  return query
  select
    u.id,
    u.email::text,
    coalesce(p.username, u.raw_user_meta_data ->> 'username', u.raw_user_meta_data ->> 'name') as username,
    coalesce(p.role, 'USER') as role,
    coalesce(p.tier, 'FREE') as tier,
    u.created_at,
    count(*) over () as total_count
  from auth.users u
  left join public.profiles p on p.id = u.id
  where (p_search is null or p_search = '' or u.email ilike '%' || p_search || '%' or coalesce(p.username, '') ilike '%' || p_search || '%')
    and (p_role is null or p_role = '' or coalesce(p.role, 'USER') = p_role)
    and (p_tier is null or p_tier = '' or coalesce(p.tier, 'FREE') = p_tier)
  order by u.created_at desc
  limit greatest(p_limit, 1) offset greatest(p_offset, 0);
end;
$$;
revoke all on function public.admin_list_users(text, text, text, int, int) from public;
grant execute on function public.admin_list_users(text, text, text, int, int) to authenticated;

create or replace function public.admin_get_user_detail(p_target_id uuid)
returns table (
  id uuid,
  email text,
  username text,
  role text,
  tier text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  return query
  select
    u.id,
    u.email::text,
    coalesce(p.username, u.raw_user_meta_data ->> 'username', u.raw_user_meta_data ->> 'name'),
    coalesce(p.role, 'USER'),
    coalesce(p.tier, 'FREE'),
    u.created_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_target_id;
end;
$$;
revoke all on function public.admin_get_user_detail(uuid) from public;
grant execute on function public.admin_get_user_detail(uuid) to authenticated;

create or replace function public.admin_set_user_role(p_target_id uuid, p_new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_old_role text;
  v_admin_count int;
begin
  if not public.is_admin(v_caller) then
    raise exception 'not authorized';
  end if;
  if p_new_role not in ('USER', 'ADMIN') then
    raise exception 'invalid role: %', p_new_role;
  end if;

  insert into public.profiles (id, email, role, tier, created_at, updated_at)
  select p_target_id, u.email, 'USER', 'FREE', u.created_at, now() from auth.users u where u.id = p_target_id
  on conflict (id) do nothing;

  select role into v_old_role from public.profiles where id = p_target_id;
  if v_old_role is null then
    raise exception 'user not found';
  end if;

  if p_target_id = v_caller and p_new_role = 'USER' and v_old_role = 'ADMIN' then
    select count(*) into v_admin_count from public.profiles where role = 'ADMIN';
    if v_admin_count <= 1 then
      raise exception 'cannot remove the last remaining admin';
    end if;
  end if;

  update public.profiles set role = p_new_role, updated_at = now() where id = p_target_id;
  insert into public.admin_audit_log (actor_id, target_id, action, old_value, new_value)
  values (v_caller, p_target_id, 'role_change', v_old_role, p_new_role);
end;
$$;
revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

create or replace function public.admin_set_user_tier(p_target_id uuid, p_new_tier text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_old_tier text;
begin
  if not public.is_admin(v_caller) then
    raise exception 'not authorized';
  end if;
  if p_new_tier not in ('FREE', 'PREMIUM') then
    raise exception 'invalid tier: %', p_new_tier;
  end if;

  insert into public.profiles (id, email, role, tier, created_at, updated_at)
  select p_target_id, u.email, 'USER', 'FREE', u.created_at, now() from auth.users u where u.id = p_target_id
  on conflict (id) do nothing;

  select tier into v_old_tier from public.profiles where id = p_target_id;
  if v_old_tier is null then
    raise exception 'user not found';
  end if;

  update public.profiles set tier = p_new_tier, updated_at = now() where id = p_target_id;
  insert into public.admin_audit_log (actor_id, target_id, action, old_value, new_value)
  values (v_caller, p_target_id, 'tier_change', v_old_tier, p_new_tier);
end;
$$;
revoke all on function public.admin_set_user_tier(uuid, text) from public;
grant execute on function public.admin_set_user_tier(uuid, text) to authenticated;

-- p_state: 'ENABLED' | 'DISABLED' | 'DEFAULT' (DEFAULT removes the override row entirely)
create or replace function public.admin_set_entitlement_override(p_target_id uuid, p_feature_id text, p_state text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_old_state text;
begin
  if not public.is_admin(v_caller) then
    raise exception 'not authorized';
  end if;
  if p_state not in ('ENABLED', 'DISABLED', 'DEFAULT') then
    raise exception 'invalid state: %', p_state;
  end if;

  select case when enabled then 'ENABLED' else 'DISABLED' end into v_old_state
  from public.entitlement_overrides where user_id = p_target_id and feature_id = p_feature_id;
  v_old_state := coalesce(v_old_state, 'DEFAULT');

  if p_state = 'DEFAULT' then
    delete from public.entitlement_overrides where user_id = p_target_id and feature_id = p_feature_id;
  else
    insert into public.entitlement_overrides (user_id, feature_id, enabled, created_at, updated_at)
    values (p_target_id, p_feature_id, p_state = 'ENABLED', now(), now())
    on conflict (user_id, feature_id) do update set enabled = excluded.enabled, updated_at = now();
  end if;

  insert into public.admin_audit_log (actor_id, target_id, action, old_value, new_value)
  values (v_caller, p_target_id, 'entitlement_override:' || p_feature_id, v_old_state, p_state);
end;
$$;
revoke all on function public.admin_set_entitlement_override(uuid, text, text) from public;
grant execute on function public.admin_set_entitlement_override(uuid, text, text) to authenticated;

-- 8) Bootstrap the first admin -----------------------------------------------------------
-- Not automatable from this migration (no email is authoritative here) - run once, by hand, in
-- the Supabase SQL editor, after this migration has been applied:
--
--   update public.profiles set role = 'ADMIN', tier = 'PREMIUM', updated_at = now()
--   where email = 'YOUR-FUT-FORGE-ACCOUNT-EMAIL';
--
-- If that account has never logged into Desktop/Browser Mode/the site yet and therefore has no
-- profiles row, run this first (harmless if the row already exists):
--
--   insert into public.profiles (id, email, role, tier, created_at, updated_at)
--   select id, email, 'ADMIN', 'PREMIUM', created_at, now() from auth.users where email = 'YOUR-FUT-FORGE-ACCOUNT-EMAIL'
--   on conflict (id) do update set role = 'ADMIN', tier = 'PREMIUM', updated_at = now();
