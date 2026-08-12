"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

// One client per browser tab is the documented pattern - createBrowserClient
// itself memoizes across calls with the same URL/key, so calling this
// wherever it's needed (rather than threading a singleton through props) is
// the intended usage, not a footgun.
export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
