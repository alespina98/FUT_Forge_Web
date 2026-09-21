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
  // The entire /fc27/* tree is anonymous, public, read-only content (no
  // route under src/app/fc27 touches auth - verified: no useWebsiteAuth,
  // Clerk or Supabase reference anywhere in src/app/fc27 or src/components/
  // fc27). Do not perform a Supabase/Clerk session lookup (or emit auth
  // cookies) for it: it adds one remote operation to every crawl/pageview
  // and makes otherwise shared HTML unsafe to cache. Originally this only
  // covered /fc27/players and /fc27/clubs; widened to the whole prefix
  // since every other /fc27 route (compare, rankings, similar, stat-finder,
  // hidden-gems, meta-rankings, leagues, nations, positions, browse, best,
  // squad-builder, news) is equally public and equally auth-independent.
  // Authenticated areas and every API route still pass through the normal
  // provider middleware below.
  if (/^\/fc27\//.test(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }
  // A failure in the auth provider call below (network blip, upstream rate
  // limit/quota, transient outage) must never take down every other route -
  // this middleware runs in front of the entire site (home, SBC, price,
  // desktop's own /api/auth/* endpoints). Degrade to "request proceeds
  // unauthenticated" instead of throwing: page/route-level auth checks
  // downstream already handle a signed-out user correctly, whereas an
  // uncaught exception here fails the request outright for every route.
  try {
    if (getAuthProvider() === "clerk") return await clerkProxy(request, event);
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
  } catch (error) {
    console.error("[middleware] auth provider call failed - proceeding unauthenticated", error);
    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
