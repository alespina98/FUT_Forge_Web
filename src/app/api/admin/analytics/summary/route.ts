import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireClerkAdmin, AdminAccessError } from "@/lib/auth/admin-gateway";
import { CLIENT_TYPES } from "@/lib/analytics/events";
import { authClause, deltaPct, normalizeAuthFilter, normalizeRange, num, platformClause } from "@/lib/analytics/query-helpers";

export const dynamic = "force-dynamic";

const RANGE_MS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const DOWNLOAD_EVENTS = ["desktop_download", "android_download", "bookmarklet_install"];
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
const VISIT_EVENTS = ["page_view", "app_open"];

export async function GET(request: Request) {
  try {
    await requireClerkAdmin();
  } catch (error) {
    const status = error instanceof AdminAccessError ? error.status : 503;
    return NextResponse.json({ ok: false, error: { code: "admin_access_denied", message: "Admin access is required." } }, { status });
  }

  const url = new URL(request.url);
  const range = normalizeRange(url.searchParams.get("range"));
  const platform = url.searchParams.get("platform");
  const authFilter = url.searchParams.get("auth");
  const rangeMs = RANGE_MS[range];
  const now = Date.now();
  const since = now - rangeMs;
  const prevSince = since - rangeMs;
  const todayStart = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z").getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const { clause: platformSql, params: platformParams } = platformClause(platform);
  const authSql = authClause(authFilter);

  const { env } = getCloudflareContext();
  const db = env.ANALYTICS_DB;
  const inList = (values: string[]) => values.map(() => "?").join(",");

  // Bucketed by hour for the 24h range, by day otherwise - SQLite strftime
  // over the ms-epoch `ts` column (integer division gives unix seconds).
  const bucketExpr = range === "24h" ? "strftime('%Y-%m-%dT%H:00:00Z', ts/1000, 'unixepoch')" : "strftime('%Y-%m-%d', ts/1000, 'unixepoch')";

  const count = (sinceMs: number, untilMs: number, events?: string[]) => {
    const eventSql = events ? ` AND event IN (${inList(events)})` : "";
    const stmt = `SELECT COUNT(*) AS n FROM analytics_events WHERE ts >= ? AND ts < ?${eventSql}${platformSql}${authSql}`;
    return db.prepare(stmt).bind(sinceMs, untilMs, ...(events ?? []), ...platformParams);
  };

  const statements = [
    count(todayStart, now + 1),                              // 0 events today
    count(yesterdayStart, todayStart),                        // 1 events yesterday (comparison)
    db.prepare(
      `SELECT COUNT(*) AS events, COUNT(DISTINCT install_id) AS active, COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN install_id END) AS authenticated
       FROM analytics_events WHERE ts >= ? AND ts < ?${platformSql}${authSql}`,
    ).bind(since, now + 1, ...platformParams),                // 2 totals current
    db.prepare(
      `SELECT COUNT(*) AS events, COUNT(DISTINCT install_id) AS active, COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN install_id END) AS authenticated
       FROM analytics_events WHERE ts >= ? AND ts < ?${platformSql}${authSql}`,
    ).bind(prevSince, since, ...platformParams),               // 3 totals previous
    count(since, now + 1, ["signup_success"]),                 // 4 signups current
    count(prevSince, since, ["signup_success"]),                // 5 signups previous
    count(since, now + 1, DOWNLOAD_EVENTS),                     // 6 downloads current
    count(prevSince, since, DOWNLOAD_EVENTS),                    // 7 downloads previous
    count(since, now + 1, ["auto_build_completed"]),             // 8 auto builds current
    count(prevSince, since, ["auto_build_completed"]),            // 9 auto builds previous
    count(since, now + 1, ["share_squad_created"]),               // 10 shared squads current
    count(prevSince, since, ["share_squad_created"]),              // 11 shared squads previous
    count(since, now + 1, ERROR_EVENTS),                           // 12 errors current
    count(prevSince, since, ERROR_EVENTS),                          // 13 errors previous
    db.prepare(`SELECT client_type, COUNT(*) AS events, COUNT(DISTINCT install_id) AS active FROM analytics_events WHERE ts >= ? AND ts < ?${platformSql}${authSql} GROUP BY client_type`).bind(since, now + 1, ...platformParams), // 14
    db.prepare(
      `SELECT client_type, COALESCE(client_version,'unknown') AS version, COUNT(DISTINCT install_id) AS installs
       FROM analytics_events WHERE ts >= ? AND ts < ?${platformSql}${authSql} GROUP BY client_type, version ORDER BY installs DESC`,
    ).bind(since, now + 1, ...platformParams),                    // 15 byVersion
    db.prepare(`SELECT event, COUNT(*) AS n FROM analytics_events WHERE ts >= ? AND ts < ? AND event IN (${inList(DOWNLOAD_EVENTS)})${platformSql}${authSql} GROUP BY event`).bind(since, now + 1, ...DOWNLOAD_EVENTS, ...platformParams), // 16
    db.prepare(`SELECT event, COUNT(*) AS n FROM analytics_events WHERE ts >= ? AND ts < ? AND event IN (${inList(AUTH_EVENTS)})${platformSql}${authSql} GROUP BY event`).bind(since, now + 1, ...AUTH_EVENTS, ...platformParams), // 17
    db.prepare(`SELECT event, COUNT(*) AS n FROM analytics_events WHERE ts >= ? AND ts < ? AND event IN (${inList(ERROR_EVENTS)})${platformSql}${authSql} GROUP BY event ORDER BY n DESC`).bind(since, now + 1, ...ERROR_EVENTS, ...platformParams), // 18
    db.prepare(
      `SELECT client_type, event, COALESCE(json_extract(properties,'$.feature'), '') AS feature, COUNT(*) AS n
       FROM analytics_events WHERE ts >= ? AND ts < ? AND event IN (${inList(ERROR_EVENTS)})${platformSql}${authSql}
       GROUP BY client_type, event, feature ORDER BY n DESC LIMIT 50`,
    ).bind(since, now + 1, ...ERROR_EVENTS, ...platformParams),  // 19 errorsDetailed
    db.prepare(`SELECT event, COUNT(*) AS n FROM analytics_events WHERE ts >= ? AND ts < ? AND event IN (${inList(FEATURE_EVENTS)})${platformSql}${authSql} GROUP BY event ORDER BY n DESC`).bind(since, now + 1, ...FEATURE_EVENTS, ...platformParams), // 20
    db.prepare(`SELECT ${bucketExpr} AS bucket, COUNT(*) AS events, COUNT(DISTINCT install_id) AS active FROM analytics_events WHERE ts >= ? AND ts < ?${platformSql}${authSql} GROUP BY bucket ORDER BY bucket`).bind(since, now + 1, ...platformParams), // 21 timeSeries
    db.prepare(`SELECT COUNT(DISTINCT install_id) AS n FROM analytics_events WHERE ts >= ? AND ts < ? AND event IN (${inList(VISIT_EVENTS)})${platformSql}${authSql}`).bind(since, now + 1, ...VISIT_EVENTS, ...platformParams), // 22 funnel visits
    db.prepare(`SELECT COUNT(DISTINCT install_id) AS n FROM analytics_events WHERE ts >= ? AND ts < ? AND event IN ('login_success','signup_success')${platformSql}${authSql}`).bind(since, now + 1, ...platformParams), // 23 funnel login/signup
    count(since, now + 1, DOWNLOAD_EVENTS),                          // 24 funnel downloads (installs would need DISTINCT - see below, reuse count query pattern differently)
    db.prepare(`SELECT COUNT(DISTINCT install_id) AS n FROM analytics_events WHERE ts >= ? AND ts < ? AND event IN (${inList(FEATURE_EVENTS)})${platformSql}${authSql}`).bind(since, now + 1, ...FEATURE_EVENTS, ...platformParams), // 25 funnel feature usage
    db.prepare(
      `SELECT event, client_type, COALESCE(client_version,'unknown') AS version, COUNT(*) AS n
       FROM analytics_events WHERE ts >= ? AND ts < ?${platformSql}${authSql}
       GROUP BY event, client_type, version ORDER BY n DESC LIMIT 200`,
    ).bind(since, now + 1, ...platformParams),                       // 26 detail table
    db.prepare(`SELECT COUNT(DISTINCT install_id) AS n FROM analytics_events WHERE ts >= ?${platformSql}${authSql}`).bind(now - RANGE_MS["24h"], ...platformParams), // 27 dau
    db.prepare(`SELECT COUNT(DISTINCT install_id) AS n FROM analytics_events WHERE ts >= ?${platformSql}${authSql}`).bind(now - RANGE_MS["7d"], ...platformParams),  // 28 wau
    db.prepare(`SELECT COUNT(DISTINCT install_id) AS n FROM analytics_events WHERE ts >= ?${platformSql}${authSql}`).bind(now - RANGE_MS["30d"], ...platformParams), // 29 mau
  ];

  // Funnel "downloads" stage needs a distinct-installs count, not a raw
  // event count - swap in the right query rather than reusing `count()`.
  statements[24] = db.prepare(`SELECT COUNT(DISTINCT install_id) AS n FROM analytics_events WHERE ts >= ? AND ts < ? AND event IN (${inList(DOWNLOAD_EVENTS)})${platformSql}${authSql}`).bind(since, now + 1, ...DOWNLOAD_EVENTS, ...platformParams);

  const [
    eventsToday, eventsYesterday, totalsCur, totalsPrev,
    signupsCur, signupsPrev, downloadsCur, downloadsPrev,
    autoBuildsCur, autoBuildsPrev, sharedCur, sharedPrev, errorsCur, errorsPrev,
    byPlatform, byVersion, downloads, authEvents, errors, errorsDetailed, features,
    timeSeries, funnelVisits, funnelLoginSignup, funnelDownloads, funnelFeature,
    detail, dau, wau, mau,
  ] = await db.batch(statements);

  const totalsCurRow = (totalsCur.results[0] as { events: number; active: number; authenticated: number } | undefined) ?? { events: 0, active: 0, authenticated: 0 };
  const totalsPrevRow = (totalsPrev.results[0] as { events: number; active: number; authenticated: number } | undefined) ?? { events: 0, active: 0, authenticated: 0 };

  const kpi = (current: number, previous: number) => ({ value: current, previous, deltaPct: deltaPct(current, previous) });

  return NextResponse.json({
    ok: true,
    range,
    platform: platform ?? "all",
    auth: normalizeAuthFilter(authFilter),
    availablePlatforms: CLIENT_TYPES,
    kpis: {
      eventsToday: kpi(num(eventsToday.results[0]), num(eventsYesterday.results[0])),
      activeUsers: kpi(totalsCurRow.active, totalsPrevRow.active),
      newSignups: kpi(num(signupsCur.results[0]), num(signupsPrev.results[0])),
      downloads: kpi(num(downloadsCur.results[0]), num(downloadsPrev.results[0])),
      autoBuilds: kpi(num(autoBuildsCur.results[0]), num(autoBuildsPrev.results[0])),
      sharedSquads: kpi(num(sharedCur.results[0]), num(sharedPrev.results[0])),
      errors: kpi(num(errorsCur.results[0]), num(errorsPrev.results[0])),
    },
    totals: totalsCurRow,
    byPlatform: byPlatform.results,
    byVersion: byVersion.results,
    downloads: downloads.results,
    authEvents: authEvents.results,
    errors: errors.results,
    errorsDetailed: errorsDetailed.results,
    features: features.results,
    timeSeries: timeSeries.results,
    funnel: {
      visits: num(funnelVisits.results[0]),
      loginOrSignup: num(funnelLoginSignup.results[0]),
      downloads: num(funnelDownloads.results[0]),
      featureUsage: num(funnelFeature.results[0]),
    },
    detail: detail.results,
    dau: num(dau.results[0]),
    wau: num(wau.results[0]),
    mau: num(mau.results[0]),
  });
}
