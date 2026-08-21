import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Cross-browser-safe password recovery: the email link carries a token_hash
// (verified server-side here via verifyOtp) instead of a PKCE code that only
// the browser/WebView which called resetPasswordForEmail() can exchange.
// Establishing the session here writes it to cookies through the shared
// @supabase/ssr cookie architecture, so whatever browser opens this link -
// not necessarily the one that requested the reset - ends up with a valid
// session once redirected to /app/reset-password.

export const dynamic = "force-dynamic";

// Single-destination allowlist: this route only ever needs to land on the
// reset-password page, so there's no reason to accept an arbitrary `next`.
const ALLOWED_NEXT = "/app/reset-password";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  if (!tokenHash || type !== "recovery") {
    return NextResponse.redirect(new URL(`${ALLOWED_NEXT}?error=invalid_request`, url.origin));
  }

  const supabase = await createSupabaseServerClient();
  // Never log tokenHash, the verifyOtp result, or anything derived from them.
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });

  if (error) {
    return NextResponse.redirect(new URL(`${ALLOWED_NEXT}?error=invalid_or_expired`, url.origin));
  }

  return NextResponse.redirect(new URL(ALLOWED_NEXT, url.origin));
}
