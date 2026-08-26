// OpenNext does not support Next.js 16 Node proxy middleware yet. Keep this
// request-boundary logic on the supported Edge middleware runtime.
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/env";
import { getAuthProvider } from "@/lib/auth/provider";

const clerkProxy = clerkMiddleware();

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  if (getAuthProvider() === "clerk") return clerkProxy(request, event);
  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
