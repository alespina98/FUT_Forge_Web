// Shared guards for src/app/api/trader/* routes (Milestone 1).
import "server-only";
import { NextResponse } from "next/server";
import { resolveTraderApplicationUserId } from "./identity";
import { resolveTraderAccess, type TraderEntitlements } from "./access";

export type TraderAccessGuard = { ok: true; applicationUserId: string; entitlements: TraderEntitlements } | { ok: false; response: NextResponse };
export type TraderIdentityGuard = { ok: true; applicationUserId: string } | { ok: false; response: NextResponse };

// Every Trader response - success or failure - carries real or
// entitlement-revealing per-user state, so every guard/helper response here
// is private, no-store. This is also what stops a cached 401 from being
// served back to a legitimately signed-in user once Workers Cache is on.
const NO_STORE = { "cache-control": "private, no-store, max-age=0" } as const;

function unauthorized(): NextResponse {
  return NextResponse.json({ ok: false, error: { code: "unauthorized", message: "Log in to use Trader." } }, { status: 401, headers: NO_STORE });
}

// Full gate: authenticated AND trader.access is true. Use for every route
// that reads/writes gated Trader configuration or persistence.
export async function requireTraderAccess(request: Request): Promise<TraderAccessGuard> {
  const applicationUserId = await resolveTraderApplicationUserId(request);
  if (!applicationUserId) return { ok: false, response: unauthorized() };
  const entitlements = await resolveTraderAccess(applicationUserId);
  if (!entitlements["trader.access"]) {
    return { ok: false, response: NextResponse.json({ ok: false, error: { code: "forbidden", message: "Trader is not enabled for this account." } }, { status: 403, headers: NO_STORE }) };
  }
  return { ok: true, applicationUserId, entitlements };
}

// Identity only, no entitlement requirement - for routes that must work
// even when Trader is disabled: the entitlements probe itself (so a client
// can find out it's closed) and consent (a prerequisite step, not a gated
// feature).
export async function requireTraderIdentity(request: Request): Promise<TraderIdentityGuard> {
  const applicationUserId = await resolveTraderApplicationUserId(request);
  if (!applicationUserId) return { ok: false, response: unauthorized() };
  return { ok: true, applicationUserId };
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ ok: false, error: { code: "invalid_request", message } }, { status: 400, headers: NO_STORE });
}
export function notFound(): NextResponse {
  return NextResponse.json({ ok: false, error: { code: "not_found", message: "Not found." } }, { status: 404, headers: NO_STORE });
}
