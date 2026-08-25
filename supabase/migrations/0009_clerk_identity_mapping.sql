create table if not exists public.auth_identity_mapping (
  legacy_supabase_user_id uuid primary key references public.profiles(id) on delete cascade,
  clerk_user_id text not null unique,
  created_at timestamptz not null default now(),
  migrated_at timestamptz,
  migration_state text not null default 'ACTIVE' check (migration_state in ('PENDING','ACTIVE','FAILED'))
);
alter table public.auth_identity_mapping enable row level security;
revoke all on public.auth_identity_mapping from public, anon, authenticated;

create or replace function public.create_clerk_identity(p_clerk_user_id text, p_email text, p_username text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid := gen_random_uuid(); v_username text := nullif(btrim(p_username), '');
begin
  if nullif(btrim(p_clerk_user_id), '') is null then raise exception 'clerk user id is required'; end if;
  if v_username is null or char_length(v_username) < 3 or char_length(v_username) > 32 then raise exception 'invalid username'; end if;
  insert into public.profiles(id,email,username,plan,role,tier,created_at,updated_at)
    values(v_id,lower(btrim(p_email)),v_username,'FREE','USER','FREE',now(),now());
  insert into public.auth_identity_mapping(legacy_supabase_user_id,clerk_user_id,migrated_at,migration_state)
    values(v_id,p_clerk_user_id,now(),'ACTIVE');
  return v_id;
end $$;
revoke all on function public.create_clerk_identity(text,text,text) from public, anon, authenticated;
grant execute on function public.create_clerk_identity(text,text,text) to service_role;

create or replace function public.map_existing_clerk_identity(p_clerk_user_id text, p_legacy_supabase_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if nullif(btrim(p_clerk_user_id), '') is null then raise exception 'clerk user id is required'; end if;
  if not exists (select 1 from public.profiles where id = p_legacy_supabase_user_id) then raise exception 'legacy profile not found'; end if;
  insert into public.auth_identity_mapping(legacy_supabase_user_id,clerk_user_id,migrated_at,migration_state)
    values(p_legacy_supabase_user_id,p_clerk_user_id,now(),'ACTIVE')
  on conflict (legacy_supabase_user_id) do update
    set clerk_user_id = excluded.clerk_user_id, migrated_at = now(), migration_state = 'ACTIVE'
    where public.auth_identity_mapping.clerk_user_id = excluded.clerk_user_id;
  if not found then raise exception 'legacy identity is already mapped'; end if;
end $$;
revoke all on function public.map_existing_clerk_identity(text,uuid) from public, anon, authenticated;
grant execute on function public.map_existing_clerk_identity(text,uuid) to service_role;
