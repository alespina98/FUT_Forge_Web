import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireClerkAdmin, AdminAccessError } from "@/lib/auth/admin-gateway";
import { CLIENT_TYPES } from "@/lib/analytics/events";
import { authClause, delta, normalizeAuthFilter, normalizeRange, num, platformClause, resolveWindow } from "@/lib/analytics/query-helpers";

export const dynamic = "force-dynamic";

const DOWNLOAD_EVENTS = ["desktop_download", "android_download", "bookmarklet_install"];
const ERROR_EVENTS = ["feature_error", "api_error", "runtime_error"];
const FEATURE_EVENTS = [
  "sbc_solver_open", "sbc_solution_generated", "sbc_quick_complete_started", "sbc_submitted",
  "sbc_completed", "sbc_failed", "sbc_group_completed",
  "evo_open", "evo_chain_generated",
  "player_search", "player_view",
  "squad_builder_open", "feature_opened", "auto_build_started", "auto_build_completed",
  "share_squad_created", "share_squad_opened",
  "bookmarklet_open", "bookmarklet_authenticated", "bookmarklet_install",
];
const VISIT_EVENTS = ["page_view", "app_open"];
const LIVE_WINDOW_MS = 5 * 60 * 1000;
const SERVICE_HEALTH_WINDOW_MS = 60 * 60 * 1000;

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
  const now = Date.now();
  const customFrom = url.searchParams.get("from") ? Number(url.searchParams.get("from")) : null;
  const customTo = url.searchParams.get("to") ? Number(url.searchParams.get("to")) : null;
  const win = resolveWindow(range, now, customFrom, customTo);
  const { clause: platformSql, params: platformParams } = platformClause(platform);
  const authSql = authClause(authFilter);

  const { env } = getCloudflareContext();
  const db = env.ANALYTICS_DB;
  const inList = (values: string[]) => values.map(() => "?").join(",");

  const bucketExpr = win.bucketGranularity === "hour" ? "strftime('%Y-%m-%dT%H:00:00Z', ts/1000, 'unixepoch')" : "strftime('%Y-%m-%d', ts/1000, 'unixepoch')";

  // Events carry a `count` property for the real number of completed units they represent (e.g. a
  // single sbc_submitted row can mean "7 challenges actually submitted" - see schema.ts's
  // COUNT_ELIGIBLE_EVENTS). Any row without it - including every pre-count event ever stored -
  // defaults to 1, so old data and events that don't use `count` at all are counted exactly as
  // before.
  const WEIGHT_EXPR = "COALESCE(CAST(json_extract(properties,'$.count') AS INTEGER), 1)";

  const count = (sinceMs: number, untilMs: number, events?: string[], mode: "rows" | "installs" | "weighted" = "rows") => {
    const eventSql = events ? ` AND event IN (${inList(events)})` : "";
    const select = mode === "installs" ? "COUNT(DISTINCT install_id)" : mode === "weighted" ? `SUM(${WEIGHT_EXPR})` : "COUNT(*)";
    const stmt = `SELECT ${select} AS n FROM analytics_events WHERE ts >= ? AND ts < ?${eventSql}${platformSql}${authSql}`;
    return db.prepare(stmt).bind(sinceMs, untilMs, ...(events ?? []), ...platformParams);
  };

  const statements = [
    // 0-1: active users current/previous (distinct installs, any event)
    count(win.since, win.until, undefined, "installs"),
    count(win.prevSince, win.prevUntil, undefined, "installs"),
    // 2-3: new signups current/previous
    count(win.since, win.until, ["signup_success"]),
    count(win.prevSince, win.prevUntil, ["signup_success"]),
    // 4-5: actions executed (feature events) current/previous - weighted so an operation that
    // completed N real SBC challenges in one event counts as N actions, not 1
    count(win.since, win.until, FEATURE_EVENTS, "weighted"),
    count(win.prevSince, win.prevUntil, FEATURE_EVENTS, "weighted"),
    // 6-7: errors current/previous - weighted for the same reason (a partial-failure feature_error
    // can represent several real failed submissions in one row)
    count(win.since, win.until, ERROR_EVENTS, "weighted"),
    count(win.prevSince, win.prevUntil, ERROR_EVENTS, "weighted"),
    // 8: time series (active users per bucket)
    db.prepare(`SELECT ${bucketExpr} AS bucket, COUNT(DISTINCT install_id) AS activeUsers FROM analytics_events WHERE ts >= ? AND ts < ?${platformSql}${authSql} GROUP BY bucket ORDER BY bucket`).bind(win.since, win.until, ...platformParams),
    // 9: time series (actions per bucket) - weighted, see 4-5
    db.prepare(`SELECT ${bucketExpr} AS bucket, SUM(${WEIGHT_EXPR}) AS actions FROM analytics_events WHERE ts >= ? AND ts < ? AND event IN (${inList(FEATURE_EVENTS)})${platformSql}${authSql} GROUP BY bucket ORDER BY bucket`).bind(win.since, win.until, ...FEATURE_EVENTS, ...platformParams),
    // 10: live - online now (independent of the selected range, always "last 5 min")
    count(now - LIVE_WINDOW_MS, now + 1, undefined, "installs"),
    // 11: live - by platform
    db.prepare(`SELECT client_type, COUNT(DISTINCT install_id) AS n FROM analytics_events WHERE ts >= ? AND ts < ?${authSql} GROUP BY client_type ORDER BY n DESC`).bind(now - LIVE_WINDOW_MS, now + 1),
    // 12: features (full ranked list) - weighted, so "Funzioni più usate" reflects real completed
    // challenges/units rather than the number of analytics rows sent
    db.prepare(`SELECT event, SUM(${WEIGHT_EXPR}) AS n FROM analytics_events WHERE ts >= ? AND ts < ? AND event IN (${inList(FEATURE_EVENTS)})${platformSql}${authSql} GROUP BY event ORDER BY n DESC`).bind(win.since, win.until, ...FEATURE_EVENTS, ...platformParams),
    // 13-16: funnel (visits -> login/signup -> downloads -> feature usage), distinct installs
    count(win.since, win.until, VISIT_EVENTS, "installs"),
    count(win.since, win.until, ["login_success", "signup_success"], "installs"),
    count(win.since, win.until, DOWNLOAD_EVENTS, "installs"),
    count(win.since, win.until, FEATURE_EVENTS, "installs"),
    // 17: service status - recent errors (independent of the selected range, always "last hour") - weighted, see 6-7
    db.prepare(`SELECT event, SUM(${WEIGHT_EXPR}) AS n FROM analytics_events WHERE ts >= ? AND ts < ? AND event IN (${inList(ERROR_EVENTS)})${platformSql}${authSql} GROUP BY event ORDER BY n DESC`).bind(now - SERVICE_HEALTH_WINDOW_MS, now + 1, ...ERROR_EVENTS, ...platformParams),
    // 18: downloads breakdown
    db.prepare(`SELECT event, COUNT(*) AS n FROM analytics_events WHERE ts >= ? AND ts < ? AND event IN (${inList(DOWNLOAD_EVENTS)})${platformSql}${authSql} GROUP BY event ORDER BY n DESC`).bind(win.since, win.until, ...DOWNLOAD_EVENTS, ...platformParams),
    // 19: versions in use
    db.prepare(`SELECT client_type, COALESCE(NULLIF(client_version,''),'unknown') AS version, COUNT(DISTINCT install_id) AS n FROM analytics_events WHERE ts >= ? AND ts < ?${platformSql}${authSql} GROUP BY client_type, version ORDER BY client_type, n DESC`).bind(win.since, win.until, ...platformParams),
    // 20: errors detailed (for the technical table) - weighted, see 6-7
    db.prepare(
      `SELECT client_type, event, COALESCE(json_extract(properties,'$.feature'), '') AS feature, SUM(${WEIGHT_EXPR}) AS n
       FROM analytics_events WHERE ts >= ? AND ts < ? AND event IN (${inList(ERROR_EVENTS)})${platformSql}${authSql}
       GROUP BY client_type, event, feature ORDER BY n DESC LIMIT 50`,
    ).bind(win.since, win.until, ...ERROR_EVENTS, ...platformParams),
    // 21: raw technical detail table - weighted, so the collapsed technical view also reflects real counts
    db.prepare(
      `SELECT event, client_type, COALESCE(NULLIF(client_version,''),'unknown') AS version, SUM(${WEIGHT_EXPR}) AS n
       FROM analytics_events WHERE ts >= ? AND ts < ?${platformSql}${authSql}
       GROUP BY event, client_type, version ORDER BY n DESC LIMIT 200`,
    ).bind(win.since, win.until, ...platformParams),
  ];

  const [
    activeCur, activePrev, signupsCur, signupsPrev, actionsCur, actionsPrev, errorsCur, errorsPrev,
    seriesActive, seriesActions, liveNow, liveByPlatform, features,
    funnelVisits, funnelAuth, funnelDownloads, funnelFeature,
    recentErrors, downloads, versions, errorsDetailed, detail,
  ] = await db.batch(statements);

  const kpi = (current: number, previous: number) => ({ value: current, previous, delta: delta(current, previous) });

  const seriesActiveRows = seriesActive.results as { bucket: string; activeUsers: number }[];
  const seriesActionsMap = new Map((seriesActions.results as { bucket: string; actions: number }[]).map((r) => [r.bucket, r.actions]));
  const timeSeries = seriesActiveRows.map((row) => ({ bucket: row.bucket, activeUsers: row.activeUsers, actions: seriesActionsMap.get(row.bucket) ?? 0 }));

  const recentErrorRows = recentErrors.results as { event: string; n: number }[];

  return NextResponse.json({
    ok: true,
    range,
    rangeLabel: win.rangeLabel,
    comparisonLabel: win.comparisonLabel,
    since: win.since,
    until: win.until,
    bucketGranularity: win.bucketGranularity,
    platform: platform ?? "all",
    auth: normalizeAuthFilter(authFilter),
    availablePlatforms: CLIENT_TYPES,
    kpis: {
      activeUsers: kpi(num(activeCur.results[0]), num(activePrev.results[0])),
      newSignups: kpi(num(signupsCur.results[0]), num(signupsPrev.results[0])),
      actionsExecuted: kpi(num(actionsCur.results[0]), num(actionsPrev.results[0])),
      errors: kpi(num(errorsCur.results[0]), num(errorsPrev.results[0])),
    },
    timeSeries,
    live: {
      onlineNow: num(liveNow.results[0]),
      byPlatform: liveByPlatform.results,
    },
    features: features.results,
    funnel: {
      visits: num(funnelVisits.results[0]),
      loginOrSignup: num(funnelAuth.results[0]),
      downloads: num(funnelDownloads.results[0]),
      featureUsage: num(funnelFeature.results[0]),
    },
    serviceStatus: {
      healthy: recentErrorRows.length === 0,
      recentErrors: recentErrorRows,
      checkedAt: new Date(now).toISOString(),
    },
    downloads: downloads.results,
    versions: versions.results,
    errorsDetailed: errorsDetailed.results,
    detail: detail.results,
  });
}
