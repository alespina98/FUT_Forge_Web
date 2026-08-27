import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RETENTION_DAYS = 90;

const authorized = (request: Request, secret: string) => {
  const value = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const a = Buffer.from(value);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
};

function dayBoundsMs(day: string): { start: number; end: number } {
  const start = Date.parse(`${day}T00:00:00.000Z`);
  return { start, end: start + 24 * 60 * 60 * 1000 };
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Not wired to a Cloudflare Cron Trigger yet (OpenNext's worker build doesn't
// expose a scheduled() export out of the box) - call this from an external
// scheduler (Cloudflare dashboard Cron Trigger hitting this URL, or a GitHub
// Actions scheduled workflow) with `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authorized(request, secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestedDay = new URL(request.url).searchParams.get("day");
  const day = requestedDay ?? isoDay(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const { start, end } = dayBoundsMs(day);
  if (Number.isNaN(start)) {
    return NextResponse.json({ ok: false, error: { code: "invalid_day", message: "day must be YYYY-MM-DD" } }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  await env.ANALYTICS_DB.batch([
    env.ANALYTICS_DB.prepare("DELETE FROM analytics_daily_rollup WHERE day = ?").bind(day),
    env.ANALYTICS_DB.prepare(
      `INSERT INTO analytics_daily_rollup (day, event, client_type, client_version, count, distinct_install_count, distinct_user_count)
       SELECT ?, event, client_type, COALESCE(client_version, ''), COUNT(*), COUNT(DISTINCT install_id), COUNT(DISTINCT user_id)
       FROM analytics_events WHERE ts >= ? AND ts < ? GROUP BY event, client_type, COALESCE(client_version, '')`,
    ).bind(day, start, end),
  ]);

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const deleted = await env.ANALYTICS_DB.prepare("DELETE FROM analytics_events WHERE ts < ?").bind(cutoff).run();

  return NextResponse.json({ ok: true, day, pruned: deleted.meta?.changes ?? 0 });
}
