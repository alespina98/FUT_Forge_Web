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
