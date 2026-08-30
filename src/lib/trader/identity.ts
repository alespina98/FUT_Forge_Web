// FUT Forge Trader — request identity resolution (Milestone 1).
//
// Mirrors resolveUserId in src/lib/analytics/server.ts: a FUTFORGE bearer
// token (Desktop/extension - see request-identity.ts) is tried first, then
// a Clerk session cookie (the web dashboard). Never trusts a client-supplied
// user id - only what the request's own auth resolves to.
import "server-only";
import { auth } from "@clerk/nextjs/server";
import { isClerkAuth } from "@/lib/auth/provider";
import { resolveRequestIdentity } from "@/lib/auth/request-identity";
import { getAppUserIdFromClerkId } from "@/lib/auth/user-gateway";

export async function resolveTraderApplicationUserId(request: Request): Promise<string | null> {
  const identity = await resolveRequestIdentity(request);
  if (identity) return identity.applicationUserId;
  if (isClerkAuth()) {
    try {
      const { userId } = await auth();
      if (userId) return await getAppUserIdFromClerkId(userId);
    } catch {
      // Clerk unavailable (e.g. no request context) - fall through to anonymous.
    }
  }
  return null;
}
