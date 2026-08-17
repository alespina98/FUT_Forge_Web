-- Canonical ADMIN-only username management. profiles.username is the only
-- displayed username source; auth metadata and email are intentionally ignored.

create or replace function public.admin_set_user_username(p_target_id uuid, p_new_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_username text := btrim(p_new_username);
  v_old_username text;
begin
  if not public.is_admin(v_caller) then
    raise exception 'not authorized';
  end if;
  if char_length(v_username) < 3 or char_length(v_username) > 32 then
    raise exception 'username must be between 3 and 32 characters';
  end if;
  if not exists (select 1 from auth.users where id = p_target_id) then
    raise exception 'user not found';
  end if;

  insert into public.profiles (id, email, role, tier, created_at, updated_at)
  select u.id, u.email, 'USER', 'FREE', u.created_at, now()
  from auth.users u where u.id = p_target_id
  on conflict (id) do nothing;

  select username into v_old_username from public.profiles where id = p_target_id;
  update public.profiles
  set username = v_username, updated_at = now()
  where id = p_target_id;

  insert into public.admin_audit_log (actor_id, target_id, action, old_value, new_value)
  values (v_caller, p_target_id, 'username_change', v_old_username, v_username);
end;
$$;
revoke all on function public.admin_set_user_username(uuid, text) from public, anon;
grant execute on function public.admin_set_user_username(uuid, text) to authenticated;

-- Remove the old metadata fallback from both admin reads.
create or replace function public.admin_list_users(
  p_search text default null, p_role text default null, p_tier text default null,
  p_limit int default 50, p_offset int default 0
)
returns table (id uuid, email text, username text, role text, tier text, created_at timestamptz, total_count bigint)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
  select u.id, u.email::text, nullif(btrim(p.username), ''), coalesce(p.role, 'USER'),
    coalesce(p.tier, 'FREE'), u.created_at, count(*) over ()
  from auth.users u left join public.profiles p on p.id = u.id
  where (p_search is null or p_search = '' or u.email ilike '%' || p_search || '%'
      or coalesce(p.username, '') ilike '%' || p_search || '%')
    and (p_role is null or p_role = '' or coalesce(p.role, 'USER') = p_role)
    and (p_tier is null or p_tier = '' or coalesce(p.tier, 'FREE') = p_tier)
  order by u.created_at desc limit greatest(p_limit, 1) offset greatest(p_offset, 0);
end;
$$;
revoke all on function public.admin_list_users(text, text, text, int, int) from public;
grant execute on function public.admin_list_users(text, text, text, int, int) to authenticated;

create or replace function public.admin_get_user_detail(p_target_id uuid)
returns table (id uuid, email text, username text, role text, tier text, created_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  return query
  select u.id, u.email::text, nullif(btrim(p.username), ''), coalesce(p.role, 'USER'),
    coalesce(p.tier, 'FREE'), u.created_at
  from auth.users u left join public.profiles p on p.id = u.id
  where u.id = p_target_id;
end;
$$;
revoke all on function public.admin_get_user_detail(uuid) from public;
grant execute on function public.admin_get_user_detail(uuid) to authenticated;
