// Next.js 16 renamed middleware.ts -> proxy.ts (same mechanism, new name/
// export). This is the standard Supabase SSR session-refresh recipe: it
// keeps the auth cookie fresh so Server Components (which cannot write
// cookies themselves - see src/lib/supabase/server.ts) always see a valid
// session on /app/club and its API route.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { NextFetchEvent } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/env";
import { getAuthProvider } from "@/lib/auth/provider";

const clerkProxy = clerkMiddleware();

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  // Clerk middleware only makes signed session state available. It does not
  // call auth.protect(); protected routes authorize at their server boundary.
  if (getAuthProvider() === "clerk") return clerkProxy(request, event);
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Touches the session so an expired token gets refreshed and the new
  // cookie is written to `response` above via setAll.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
