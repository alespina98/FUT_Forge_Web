import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eventBatchSchema, eventEnvelopeSchema } from "@/lib/analytics/schema";
import { checkRateLimit, insertEvents, resolveUserId } from "@/lib/analytics/server";

export const dynamic = "force-dynamic";

// Generous enough for a full 25-event batch with properties, small enough to
// block payload-size abuse (Section 5: "limite sulla dimensione del payload").
const MAX_BODY_BYTES = 64 * 1024;

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: { code: "payload_too_large", message: "Request body exceeds the size limit." } }, { status: 413 });
  }

  const bodyText = await request.text().catch(() => null);
  if (bodyText === null) {
    return NextResponse.json({ ok: false, error: { code: "invalid_body", message: "Request body must be readable text." } }, { status: 400 });
  }
  // Content-Length can be absent/spoofed; enforce the cap on the bytes actually read too.
  if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: { code: "payload_too_large", message: "Request body exceeds the size limit." } }, { status: 413 });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(bodyText);
  } catch {
    raw = null;
  }
  if (typeof raw !== "object" || raw === null) {
    return NextResponse.json({ ok: false, error: { code: "invalid_body", message: "Request body must be a JSON object." } }, { status: 400 });
  }

  const asBatch = eventBatchSchema.safeParse(raw);
  const asSingle = asBatch.success ? null : eventEnvelopeSchema.safeParse(raw);
  const events = asBatch.success ? asBatch.data.events : asSingle?.success ? [asSingle.data] : null;
  if (!events) {
    return NextResponse.json({ ok: false, error: { code: "invalid_payload", message: "Payload does not match the analytics event schema." } }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  const rateLimitKey = events[0]?.install_id || request.headers.get("cf-connecting-ip") || "anonymous";
  const allowed = await checkRateLimit(env.ANALYTICS_RATE_LIMIT, rateLimitKey);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: { code: "rate_limited", message: "Too many analytics events." } }, { status: 429 });
  }

  const userId = await resolveUserId(request);
  await insertEvents(env.ANALYTICS_DB, events, userId);

  return NextResponse.json({ ok: true, accepted: events.length });
}
