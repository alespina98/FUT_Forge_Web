"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getDisplayName, useAuthUser, useOwnProfile } from "@/lib/use-auth-user";

export type WebsiteAuthView = {
  status: "loading" | "signedOut" | "signedIn";
  authenticated: boolean;
  userId: string | null;
  username: string;
  role: "USER" | "ADMIN" | null;
  tier: "FREE" | "PREMIUM" | null;
};

const signedOut: WebsiteAuthView = { status: "signedOut", authenticated: false, userId: null, username: "", role: null, tier: null };
const Context = createContext<WebsiteAuthView>({ ...signedOut, status: "loading" });

export function useWebsiteAuth() { return useContext(Context); }

export function ClerkWebsiteAuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerkUserId = user?.id;
  const [profileResult, setProfileResult] = useState<{ ownerId: string; profile: { id: string; username: string; role: "USER" | "ADMIN"; tier: "FREE" | "PREMIUM" } | null } | null>(null);
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !clerkUserId) return;
    const controller = new AbortController();
    fetch("/api/auth/profile", { cache: "no-store", signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(value => { if (!controller.signal.aborted) setProfileResult({ ownerId: clerkUserId, profile: value }); })
      .catch(() => { if (!controller.signal.aborted) setProfileResult({ ownerId: clerkUserId, profile: null }); });
    return () => controller.abort();
  }, [isLoaded, isSignedIn, clerkUserId]);
  const profile = profileResult?.ownerId === clerkUserId ? profileResult?.profile ?? null : null;
  const value: WebsiteAuthView = !isLoaded ? { ...signedOut, status: "loading" } : !isSignedIn || !user ? signedOut : {
    status: "signedIn", authenticated: true, userId: profile?.id ?? null,
    username: profile?.username || user.username || user.fullName || user.primaryEmailAddress?.emailAddress.split("@")[0] || "Account",
    role: profile?.role ?? null, tier: profile?.tier ?? null,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function SupabaseWebsiteAuthProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuthUser();
  const profile = useOwnProfile(status === "signedIn" ? user?.id : null);
  const value: WebsiteAuthView = status === "loading" ? { ...signedOut, status } : status === "signedOut" || !user ? signedOut : {
    status, authenticated: true, userId: user.id, username: getDisplayName(user), role: profile?.role ?? null, tier: profile?.tier ?? null,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
