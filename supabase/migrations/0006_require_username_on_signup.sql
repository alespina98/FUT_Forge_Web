-- Enforce username as mandatory AND unique (case-insensitive) on signup,
-- atomically, for every registration channel. There is exactly one: the
-- website's own supabase.auth.signUp() call in register-form.tsx - Desktop
-- (futforge_auth.py) and the shared injected JS (futforge_core/futforge_auth.js)
-- used by Browser Extension/Bookmarklet/Android have no signUp/createUser
-- code of their own; their "Sign up" links all open this same page.
--
-- Root cause this closes: username was previously only validated in the
-- React form (register-form.tsx's `username.trim().length < 3` check).
-- auth.signUp() and the profiles auto-provisioning trigger
-- (0004_admin_control_plane.sql, handle_new_user_profile) both accepted
-- any raw_user_meta_data, including a missing/empty/whitespace-only or
-- already-taken username, since the anon key used to call signUp is public
-- and the form's client-side check is trivially bypassed by calling the
-- API directly. The result was a valid, loggable-in auth.users account
-- whose profiles.username was null - and since futforge_auth.js's
-- publicUser() already treats a profile with no username as "no verified
-- FUT Forge identity" (returns null rather than inventing one), that
-- account was unusable inside the app despite existing successfully in
-- Supabase Auth. Two accounts could also end up with usernames that only
-- differed by case ("Alessio" vs "alessio"), which is the same identity
-- for display/lookup purposes in this app.
--
-- handle_new_user_profile() runs AFTER INSERT ON auth.users, inside the
-- SAME transaction as the auth.users insert itself (this is how Supabase
-- Auth's signup flow works - the trigger fires before that transaction
-- commits). Raising an exception here therefore rolls back the entire
-- signup, including the auth.users row - there is no window in which an
-- auth user can exist without a valid, unique username, and no
-- orphaned/partial account is possible.
--
-- Deliberately does NOT touch profiles.username's column definition (no
-- NOT NULL / CHECK constraint added there): existing rows created before
-- this migration - including the "site-only signups" the 0004 backfill
-- comment explicitly calls out - may already have a null/empty username,
-- and must remain able to log in unaffected. This migration only changes
-- what happens for NEW rows inserted by this trigger, i.e. new
-- registrations, and for the admin_set_user_username RPC (0005) when it
-- assigns a username to an existing row.
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
  -- Same 3-32 rule the client (register-form.tsx) and admin_set_user_username
  -- already enforce - without this, a caller bypassing the UI and calling
  -- auth.signUp() directly could still slip a 1-char or 500-char username
  -- past the "not empty" check above, since profiles.username itself has no
  -- length constraint.
  if char_length(v_username) < 3 or char_length(v_username) > 32 then
    raise exception 'username must be between 3 and 32 characters' using errcode = '23514';
  end if;

  begin
    insert into public.profiles (id, email, username, role, tier, created_at, updated_at)
    values (new.id, new.email, v_username, 'USER', 'FREE', now(), now())
    on conflict (id) do nothing;
  exception
    -- Raised by profiles_username_unique_ci below when the normalized
    -- (trimmed, lowercased) username collides with an existing profile.
    -- Re-raised with a stable, human-readable message; the client can't
    -- rely on this text reaching it through GoTrue (see register-form.tsx),
    -- but it keeps server-side logs/debugging clear and gives any direct
    -- SQL caller a sane error instead of a raw constraint-name dump.
    when unique_violation then
      raise exception 'username already taken' using errcode = '23505';
  end;
  return new;
end;
$$;

-- Case-insensitive uniqueness, enforced at the database level so it cannot
-- be bypassed by calling the API directly or by any future signup channel.
-- Defensive pre-check: fail the migration loudly instead of silently
-- corrupting or auto-correcting existing data if duplicate normalized
-- usernames somehow already exist. We already verified manually that no
-- duplicates exist today, but this migration must not assume that stays
-- true - it must refuse to proceed rather than guess at a fix.
do $$
declare
  v_duplicate_count int;
begin
  select count(*) into v_duplicate_count
  from (
    select lower(btrim(username)) as normalized_username
    from public.profiles
    where username is not null and btrim(username) <> ''
    group by lower(btrim(username))
    having count(*) > 1
  ) duplicates;

  if v_duplicate_count > 0 then
    raise exception
      'Cannot create profiles_username_unique_ci: % normalized username(s) are already duplicated in public.profiles. Resolve these manually (this migration will not auto-merge or delete data) before re-running.',
      v_duplicate_count;
  end if;
end $$;

-- Partial index (excludes null/empty usernames) so legacy rows without a
-- username - untouched by this migration - can coexist without colliding
-- with each other or blocking the index's creation.
create unique index if not exists profiles_username_unique_ci
  on public.profiles (lower(btrim(username)))
  where username is not null and btrim(username) <> '';

-- Lets the registration form know a username is taken *before* calling
-- auth.signUp(), which is otherwise the only reliable way to surface a
-- clear "username already taken" error to the user - see register-form.tsx
-- for why GoTrue's response can't be parsed for this instead. Returns a
-- bare boolean only: no profile data (email, role, tier, ids, ...) is
-- exposed, so this does not weaken profiles' RLS or leak sensitive data.
-- Still just a pre-check for UX - profiles_username_unique_ci above is what
-- actually prevents the race condition of two signups claiming the same
-- normalized username at once.
--
-- Accepted trade-off: being callable by anon (required, since registration
-- happens pre-auth) means anyone can enumerate which usernames are taken by
-- probing candidates one at a time. This is the same trade-off every
-- "check username availability" feature makes (GitHub, Twitter, etc.) - it
-- reveals only existence of a username, nothing else (no email, id, role,
-- tier). Removing the pre-check to avoid this would leave signup with no
-- reliable "taken" UX at all (GoTrue masks the trigger's real error), which
-- is a worse trade-off for a feature this low-sensitivity.
--
-- For any input that registration would reject anyway (null/empty/whitespace,
-- or outside the 3-32 char rule enforced by handle_new_user_profile and
-- admin_set_user_username), returns false rather than true - such a value
-- could never actually be registered, so calling it "available" would be
-- misleading. Keeps one coherent accept/reject rule shared by the client,
-- this RPC, the signup trigger, and the admin RPC.
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select case
    when nullif(btrim(p_username), '') is null then false
    when char_length(btrim(p_username)) < 3 then false
    when char_length(btrim(p_username)) > 32 then false
    else not exists (
      select 1
      from public.profiles
      where username is not null
        and btrim(username) <> ''
        and lower(btrim(username)) = lower(btrim(p_username))
    )
  end;
$$;
revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

-- Bring admin_set_user_username (introduced in 0005_admin_username_management.sql,
-- left untouched there) up to the same rules as signup: required, trimmed,
-- 3-32 chars (already enforced in 0005, preserved as-is here), and now also
-- case-insensitive-unique against every OTHER profile. Redefined here via
-- CREATE OR REPLACE rather than editing 0005, per historical-migration
-- policy; existing grants/revokes from 0005 apply unchanged to the
-- replacement body.
create or replace function public.admin_set_user_username(p_target_id uuid, p_new_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_username text := nullif(btrim(p_new_username), '');
  v_old_username text;
begin
  if not public.is_admin(v_caller) then
    raise exception 'not authorized';
  end if;
  if v_username is null then
    raise exception 'username is required';
  end if;
  if char_length(v_username) < 3 or char_length(v_username) > 32 then
    raise exception 'username must be between 3 and 32 characters';
  end if;
  if not exists (select 1 from auth.users where id = p_target_id) then
    raise exception 'user not found';
  end if;
  if exists (
    select 1 from public.profiles
    where id <> p_target_id
      and username is not null
      and btrim(username) <> ''
      and lower(btrim(username)) = lower(v_username)
  ) then
    raise exception 'username already taken' using errcode = '23505';
  end if;

  insert into public.profiles (id, email, role, tier, created_at, updated_at)
  select u.id, u.email, 'USER', 'FREE', u.created_at, now()
  from auth.users u where u.id = p_target_id
  on conflict (id) do nothing;

  select username into v_old_username from public.profiles where id = p_target_id;

  begin
    update public.profiles
    set username = v_username, updated_at = now()
    where id = p_target_id;
  exception
    -- Belt-and-suspenders against a race between the exists() check above and
    -- this update - profiles_username_unique_ci is the actual backstop.
    when unique_violation then
      raise exception 'username already taken' using errcode = '23505';
  end;

  insert into public.admin_audit_log (actor_id, target_id, action, old_value, new_value)
  values (v_caller, p_target_id, 'username_change', v_old_username, v_username);
end;
$$;
