import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

/**
 * Server-side Supabase client for Server Components and Route Handlers.
 * Always create a new one per request (per @supabase/ssr's own guidance) -
 * never share/cache this across requests.
 *
 * `setAll` is best-effort: called from a Server Component (not a Route
 * Handler or Server Action) it will throw, because Next.js doesn't allow
 * setting cookies mid-render - middleware.ts is what actually keeps the
 * session cookie refreshed in that case, so swallowing the error here is
 * intentional, not a bug.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component - middleware.ts refreshes the
          // session instead. See docstring above.
        }
      },
    },
  });
}
