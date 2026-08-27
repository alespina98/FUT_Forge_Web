import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireClerkAdmin, AdminAccessError } from "@/lib/auth/admin-gateway";
import { CLIENT_TYPES } from "@/lib/analytics/events";

export const dynamic = "force-dynamic";

const RANGE_MS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const DOWNLOAD_EVENTS = ["desktop_download", "android_download"];
const AUTH_EVENTS = ["login_success", "login_failed", "signup_success"];
const ERROR_EVENTS = ["feature_error", "api_error", "runtime_error"];
const FEATURE_EVENTS = [
  "sbc_solver_open", "sbc_solution_generated", "sbc_submitted", "sbc_completed", "sbc_failed",
  "evo_open", "evo_chain_generated",
  "player_search", "player_view",
  "squad_builder_open", "auto_build_started", "auto_build_completed",
  "share_squad_created", "share_squad_opened",
  "bookmarklet_open", "bookmarklet_authenticated", "bookmarklet_install",
];

function platformClause(platform: string | null): { clause: string; params: string[] } {
  if (!platform || platform === "all") return { clause: "", params: [] };
  return { clause: " AND client_type = ?", params: [platform] };
}

export async function GET(request: Request) {
  try {
    await requireClerkAdmin();
  } catch (error) {
    const status = error instanceof AdminAccessError ? error.status : 503;
    return NextResponse.json({ ok: false, error: { code: "admin_access_denied", message: "Admin access is required." } }, { status });
  }

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "24h";
  const platform = url.searchParams.get("platform");
  const rangeMs = RANGE_MS[range] ?? RANGE_MS["24h"];
  const since = Date.now() - rangeMs;
  const todayStart = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z").getTime();
  const { clause: platformSql, params: platformParams } = platformClause(platform);

  const { env } = getCloudflareContext();
  const db = env.ANALYTICS_DB;

  const inList = (values: string[]) => values.map(() => "?").join(",");

  const statements = [
    db.prepare(`SELECT COUNT(*) AS n FROM analytics_events WHERE ts >= ?${platformSql}`).bind(todayStart, ...platformParams),
    db.prepare(
      `SELECT COUNT(*) AS events, COUNT(DISTINCT install_id) AS active, COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN install_id END) AS authenticated
       FROM analytics_events WHERE ts >= ?${platformSql}`,
    ).bind(since, ...platformParams),
    db.prepare(`SELECT client_type, COUNT(*) AS events, COUNT(DISTINCT install_id) AS active FROM analytics_events WHERE ts >= ?${platformSql} GROUP BY client_type`).bind(since, ...platformParams),
    db.prepare(
      `SELECT client_type, COALESCE(client_version,'unknown') AS version, COUNT(DISTINCT install_id) AS installs
       FROM analytics_events WHERE ts >= ?${platformSql} GROUP BY client_type, version ORDER BY installs DESC`,
    ).bind(since, ...platformParams),
    db.prepare(`SELECT event, COUNT(*) AS n FROM analytics_events WHERE ts >= ? AND event IN (${inList(DOWNLOAD_EVENTS)})${platformSql} GROUP BY event`).bind(since, ...DOWNLOAD_EVENTS, ...platformParams),
    db.prepare(`SELECT event, COUNT(*) AS n FROM analytics_events WHERE ts >= ? AND event IN (${inList(AUTH_EVENTS)})${platformSql} GROUP BY event`).bind(since, ...AUTH_EVENTS, ...platformParams),
    db.prepare(`SELECT event, COUNT(*) AS n FROM analytics_events WHERE ts >= ? AND event IN (${inList(ERROR_EVENTS)})${platformSql} GROUP BY event`).bind(since, ...ERROR_EVENTS, ...platformParams),
    db.prepare(`SELECT event, COUNT(*) AS n FROM analytics_events WHERE ts >= ? AND event IN (${inList(FEATURE_EVENTS)})${platformSql} GROUP BY event`).bind(since, ...FEATURE_EVENTS, ...platformParams),
    db.prepare(`SELECT COUNT(DISTINCT install_id) AS n FROM analytics_events WHERE ts >= ?${platformSql}`).bind(Date.now() - RANGE_MS["24h"], ...platformParams),
    db.prepare(`SELECT COUNT(DISTINCT install_id) AS n FROM analytics_events WHERE ts >= ?${platformSql}`).bind(Date.now() - RANGE_MS["7d"], ...platformParams),
    db.prepare(`SELECT COUNT(DISTINCT install_id) AS n FROM analytics_events WHERE ts >= ?${platformSql}`).bind(Date.now() - RANGE_MS["30d"], ...platformParams),
  ];

  const [eventsToday, totals, byPlatform, byVersion, downloads, authEvents, errors, features, dau, wau, mau] = await db.batch(statements);

  return NextResponse.json({
    ok: true,
    range,
    platform: platform ?? "all",
    availablePlatforms: CLIENT_TYPES,
    eventsToday: Number((eventsToday.results[0] as { n: number } | undefined)?.n ?? 0),
    totals: totals.results[0] ?? { events: 0, active: 0, authenticated: 0 },
    byPlatform: byPlatform.results,
    byVersion: byVersion.results,
    downloads: downloads.results,
    authEvents: authEvents.results,
    errors: errors.results,
    features: features.results,
    dau: Number((dau.results[0] as { n: number } | undefined)?.n ?? 0),
    wau: Number((wau.results[0] as { n: number } | undefined)?.n ?? 0),
    mau: Number((mau.results[0] as { n: number } | undefined)?.n ?? 0),
  });
}
