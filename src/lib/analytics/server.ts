import "server-only";
import { auth } from "@clerk/nextjs/server";
import { isClerkAuth } from "@/lib/auth/provider";
import { resolveRequestIdentity } from "@/lib/auth/request-identity";
import { getAppUserIdFromClerkId } from "@/lib/auth/user-gateway";
import { normalizeClientType, CURRENT_EVENT_CONTRACT_VERSION } from "./events";
import type { EventEnvelope } from "./schema";

// Never trust a client-supplied user id - only what the request's own auth
// (the same bearer token / session cookie the client already uses for its
// real API calls) resolves to. Anonymous (no/invalid auth) always succeeds.
export async function resolveUserId(request: Request): Promise<string | null> {
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

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_PER_WINDOW = 120;

// Fixed-window counter in KV. Not atomic (a rare race can let a couple of
// extra requests through under concurrency) - acceptable for a best-effort
// abuse guard, not a correctness-critical limit.
export async function checkRateLimit(kv: KVNamespace, key: string): Promise<boolean> {
  const bucket = Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW_SECONDS);
  const kvKey = `rl:${key}:${bucket}`;
  const current = Number((await kv.get(kvKey)) ?? "0");
  if (current >= RATE_LIMIT_MAX_PER_WINDOW) return false;
  await kv.put(kvKey, String(current + 1), { expirationTtl: RATE_LIMIT_WINDOW_SECONDS * 2 });
  return true;
}

export async function insertEvents(db: D1Database, events: EventEnvelope[], userId: string | null): Promise<void> {
  const now = Date.now();
  // INSERT OR IGNORE makes a repeated event_id (retry/duplicate-send from a
  // client's offline queue) a no-op instead of a duplicate row. Events
  // without an event_id (pre-v1 clients) are never deduplicated - every
  // NULL is distinct under the column's UNIQUE index, matching plain SQL
  // semantics, so this is safe to use unconditionally for the whole batch.
  const statement = db.prepare(
    "INSERT OR IGNORE INTO analytics_events (event, event_id, event_version, ts, received_at, client_type, client_version, install_id, user_id, session_id, properties) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
  );
  const batch = events.flatMap((event) => {
    const clientType = normalizeClientType(event.client_type);
    if (!clientType) return []; // unreachable given schema validation, but never insert an unrecognized platform
    return [
      statement.bind(
        event.event,
        event.event_id ?? null,
        event.event_version ?? CURRENT_EVENT_CONTRACT_VERSION,
        event.timestamp ?? now,
        now,
        clientType,
        event.client_version ?? null,
        event.install_id,
        userId,
        event.session_id ?? null,
        event.properties ? JSON.stringify(event.properties) : null,
      ),
    ];
  });
  if (batch.length) await db.batch(batch);
}
