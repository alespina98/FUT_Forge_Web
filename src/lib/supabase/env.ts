// The FUT Forge account system - the exact same Supabase project and
// publishable/anon key Desktop already uses (futforge_auth.py). Not a
// second auth system: logging in here logs into the same FUT Forge account
// used by Desktop's Club Sync.
//
// This key is the *publishable* anon key, not a secret - Supabase's Row
// Level Security (see FUT_Forge/supabase/migrations/0001_club_sync.sql) is
// what actually protects user data, so it's safe to ship to the browser via
// NEXT_PUBLIC_*. The defaults below match the values already hardcoded in
// futforge_auth.py; override via env vars only if the project ever changes.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://axjuxmjoowrzmvyhbdhv.supabase.co";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_bMremihmEy34CWp5rG6M-g_UuysymCX";
