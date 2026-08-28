import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eventBatchSchema, eventEnvelopeSchema } from "@/lib/analytics/schema";
import { checkRateLimit, insertEvents, resolveUserId } from "@/lib/analytics/server";

export const dynamic = "force-dynamic";

// Generous enough for a full 25-event batch with properties, small enough to
// block payload-size abuse (Section 5: "limite sulla dimensione del payload").
const MAX_BODY_BYTES = 64 * 1024;

// This is a public, write-only, rate-limited, schema-validated beacon endpoint - not sensitive
// data - so a wildcard origin is the correct policy, not an oversight. Real callers are
// cross-origin by nature: the Chrome extension's service worker (futforgeofficial.com is not in
// its host_permissions, so it gets no CORS exemption) and the bookmarklet (fetch() runs on
// www.ea.com). Without these headers every such fetch() throws "TypeError: Failed to fetch"
// before the request body is ever sent - confirmed against a real browser, not just curl/Node,
// which don't enforce CORS and would otherwise hide this entirely.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BODY_BYTES) {
    return json({ ok: false, error: { code: "payload_too_large", message: "Request body exceeds the size limit." } }, 413);
  }

  const bodyText = await request.text().catch(() => null);
  if (bodyText === null) {
    return json({ ok: false, error: { code: "invalid_body", message: "Request body must be readable text." } }, 400);
  }
  // Content-Length can be absent/spoofed; enforce the cap on the bytes actually read too.
  if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
    return json({ ok: false, error: { code: "payload_too_large", message: "Request body exceeds the size limit." } }, 413);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(bodyText);
  } catch {
    raw = null;
  }
  if (typeof raw !== "object" || raw === null) {
    return json({ ok: false, error: { code: "invalid_body", message: "Request body must be a JSON object." } }, 400);
  }

  const asBatch = eventBatchSchema.safeParse(raw);
  const asSingle = asBatch.success ? null : eventEnvelopeSchema.safeParse(raw);
  const events = asBatch.success ? asBatch.data.events : asSingle?.success ? [asSingle.data] : null;
  if (!events) {
    return json({ ok: false, error: { code: "invalid_payload", message: "Payload does not match the analytics event schema." } }, 400);
  }

  const { env } = getCloudflareContext();
  const rateLimitKey = events[0]?.install_id || request.headers.get("cf-connecting-ip") || "anonymous";
  const allowed = await checkRateLimit(env.ANALYTICS_RATE_LIMIT, rateLimitKey);
  if (!allowed) {
    return json({ ok: false, error: { code: "rate_limited", message: "Too many analytics events." } }, 429);
  }

  const userId = await resolveUserId(request);
  await insertEvents(env.ANALYTICS_DB, events, userId);

  return json({ ok: true, accepted: events.length }, 200);
}
