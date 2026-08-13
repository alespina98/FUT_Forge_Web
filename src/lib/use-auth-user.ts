"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "./supabase/client";

export type AuthUserState = { status: "loading" | "signedOut" | "signedIn"; user: User | null };

// Single shared client-side session check + live subscription, used by the
// navbar account widget, the account panel, and the Browser Mode locked
// state - so all three agree on auth state instantly (e.g. right after
// login/logout) without each re-implementing the same getUser()/
// onAuthStateChange wiring.
export function useAuthUser(): AuthUserState {
  const [state, setState] = useState<AuthUserState>({ status: "loading", user: null });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setState({ status: data.user ? "signedIn" : "signedOut", user: data.user ?? null });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setState({ status: session?.user ? "signedIn" : "signedOut", user: session?.user ?? null });
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export type OwnProfile = { role: "USER" | "ADMIN"; tier: "FREE" | "PREMIUM" } | null;

// The signed-in user's own role/tier, straight from `profiles` (RLS: a user
// may always read their own row). Used for account-panel display and to
// decide whether to *show* the discreet "Admin" link - a UI convenience,
// never the security boundary: every admin_* RPC re-checks is_admin()
// against the caller's real session before doing anything, so a forged/
// stale client value here can't grant access - worst case a non-admin
// briefly sees a link that then fails via the RPC.
export function useOwnProfile(userId: string | null | undefined): OwnProfile {
  const [profile, setProfile] = useState<OwnProfile>(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("profiles")
      .select("role, tier")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProfile({ role: data?.role === "ADMIN" ? "ADMIN" : "USER", tier: data?.tier === "PREMIUM" ? "PREMIUM" : "FREE" });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return profile;
}

// Same fallback chain as futforge_auth.js's publicUser() (name = profiles
// row's username || user_metadata.username || user_metadata.name || email
// local-part) minus the profiles-row lookup, which is Desktop-only - the
// site only ever has user_metadata to go on, which is exactly the field
// registration now writes to. Kept as one shared helper so the navbar chip
// and the account panel can never disagree on what "no username yet" means.
export function getDisplayName(user: User | null | undefined): string {
  if (!user) return "";
  const meta = (user.user_metadata || {}) as { username?: string; name?: string };
  return meta.username || meta.name || (user.email ? user.email.split("@")[0] : "");
}
