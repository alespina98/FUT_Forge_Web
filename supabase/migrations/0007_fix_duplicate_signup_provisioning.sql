-- Root cause (bug B, confirmed via production pg_trigger/pg_constraint reads,
-- kept separate from bug A - the Supabase Auth email rate limit - and bug C -
-- Dashboard "Create user" requiring raw_user_meta_data.username, both already
-- understood and out of scope for this migration):
--
-- Production has TWO AFTER INSERT triggers on auth.users, never both known to
-- the same codebase - a legacy, untracked one (on_auth_user_created ->
-- handle_new_user(), created directly on the Supabase project, like
-- public.profiles itself, and never present in any migration in this repo or
-- in FUT_Forge - confirmed by grep, zero references anywhere) and the
-- canonical one this repo owns (on_auth_user_created_profile_defaults ->
-- handle_new_user_profile(), from 0004, redefined by 0006). Postgres fires
-- same-event triggers in alphabetical order by trigger name;
-- "on_auth_user_created" is a strict prefix of
-- "on_auth_user_created_profile_defaults" and therefore always sorts first,
-- so the legacy trigger always runs BEFORE the canonical one, on every
-- signup, deterministically (not a race).
--
-- handle_new_user() unconditionally inserts (id, email, username=NULL,
-- plan='FREE', created_at) first. handle_new_user_profile() then runs second
-- and tries to insert the full validated row for the same id. Its
-- `ON CONFLICT (id) DO NOTHING` only suppresses the conflict on the `id`
-- primary key (the specified arbiter) - it never gets a chance to write the
-- real username, since the row already exists. Result: profiles.username is
-- silently left NULL forever for every new signup, despite handle_new_user_
-- profile()'s own "username is required" contract - a correctness bug, even
-- though (per production's confirmed pg_constraint list: only
-- profiles_id_fkey, profiles_pkey, profiles_plan_check, profiles_role_check,
-- profiles_tier_check - no separate unique constraint on email) this does
-- NOT raise an exception and is unrelated to the 429 rate-limit error users
-- were actually seeing.
--
-- Fix: exactly one authoritative provisioning path. Drop the untracked
-- legacy trigger and function entirely, and fold its one meaningful side
-- effect - profiles.plan = 'FREE', which Desktop (futforge_auth.py /
-- futforge_auth.js's loadProfile/effectivePlan) already reads - into the
-- canonical handle_new_user_profile(), so nothing downstream of `plan`
-- changes behavior for existing consumers. Every guarantee 0006 already
-- enforces (username required/trimmed/3-32 chars, case-insensitive
-- uniqueness via profiles_username_unique_ci, atomic rollback, role='USER'/
-- tier='FREE' defaults) is untouched - only the insert's column list gains
-- `plan`. 0004/0005/0006 are historical and are not edited by this file.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := nullif(btrim(new.raw_user_meta_data ->> 'username'), '');
begin
  if v_username is null then
    raise exception 'username is required' using errcode = '23514';
  end if;
  if char_length(v_username) < 3 or char_length(v_username) > 32 then
    raise exception 'username must be between 3 and 32 characters' using errcode = '23514';
  end if;

  begin
    insert into public.profiles (id, email, username, plan, role, tier, created_at, updated_at)
    values (new.id, new.email, v_username, 'FREE', 'USER', 'FREE', now(), now())
    on conflict (id) do nothing;
  exception
    when unique_violation then
      raise exception 'username already taken' using errcode = '23505';
  end;
  return new;
end;
$$;

-- on_auth_user_created_profile_defaults (from 0004) already points at
-- handle_new_user_profile() by name and is unaffected by CREATE OR REPLACE -
-- no trigger DDL needed for it here.
