// FC27 EA ratings downloader - pulls the complete public FC27 ratings
// catalog from EA's own Next.js data endpoint (no Playwright, no DOM
// scraping - see the FC27 fast-data-source investigation this replaces).
//
// EA's ratings listing page server-renders its data into a __NEXT_DATA__
// script tag; the same payload is also reachable directly as JSON via
// Next.js's own /_next/data/{buildId}/... route, one request per 100-player
// page. buildId changes on every EA deploy, so it is never hardcoded - it's
// read live from the current page and re-discovered (once per run) if a
// page request 404s, which is the signal EA shipped a new build mid-run.
//
// Usage: node --experimental-strip-types scripts/fc27/download-ea-ratings.ts
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const ORIGIN = "https://www.ea.com";
const RATINGS_PAGE_URL = `${ORIGIN}/en/games/ea-sports-fc/ratings`;
const FRANCHISE_SLUG = "ea-sports-fc";

const OUT_ROOT = path.resolve(import.meta.dirname, "../../data/fc27");
const CACHE_DIR = path.join(OUT_ROOT, ".cache");
const PAGES_DIR = path.join(CACHE_DIR, "pages");
const STATE_PATH = path.join(CACHE_DIR, "state.json");
const RAW_DIR = path.join(OUT_ROOT, "raw");
const NORMALIZED_DIR = path.join(OUT_ROOT, "normalized");

const REQUEST_DELAY_MS = 1000;
const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 1000;
const BACKOFF_CAP_MS = 20_000;

type StatPair = { value: number; diff: number };
type RawStats = Record<string, { value: number; diff?: number } | null | undefined>;
type RawPositionRef = { id: string; label: string; shortLabel: string };
type RawTeam = { id: number; label: string; imageUrl: string; isPopular?: boolean } | null;
type RawNationality = { id: number; label: string; imageUrl: string } | null;
type RawItem = {
  id: number;
  rank: number;
  overallRating: number;
  firstName: string;
  lastName: string;
  commonName: string | null;
  birthdate: string | null;
  height: string;
  weight: string;
  skillMoves: number | null;
  weakFootAbility: number | null;
  preferredFoot: number | null;
  leagueName: string | null;
  avatarUrl: string | null;
  shieldUrl: string | null;
  alternatePositions: RawPositionRef[] | null;
  playerAbilities: unknown[];
  gender: { id: number; label: string } | null;
  nationality: RawNationality;
  team: RawTeam;
  position: (RawPositionRef & { positionType: { id: string; name: string } }) | null;
  stats: RawStats;
};

type FetchOutcome = { kind: "ok"; totalItems: number; items: RawItem[] } | { kind: "not_found" };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function nextDataFromHtml(html: string): { buildId: string } {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("__NEXT_DATA__ script tag not found on the EA ratings page");
  const parsed = JSON.parse(match[1]) as { buildId?: string };
  if (!parsed.buildId) throw new Error("__NEXT_DATA__ payload had no buildId");
  return { buildId: parsed.buildId };
}

async function discoverBuildId(): Promise<string> {
  const response = await fetch(RATINGS_PAGE_URL, { headers: { Accept: "text/html" } });
  if (!response.ok) throw new Error(`Could not load the EA ratings page (HTTP ${response.status})`);
  const html = await response.text();
  return nextDataFromHtml(html).buildId;
}

function nextDataUrl(buildId: string, page: number): string {
  return `${ORIGIN}/_next/data/${buildId}/en/games/ea-sports-fc/ratings.json?page=${page}&franchiseSlug=${FRANCHISE_SLUG}`;
}

const perf = { requests: 0, retries: 0, rateLimited: 0, httpErrors: 0, responseTimesMs: [] as number[], startedAt: 0, finishedAt: 0 };

async function fetchPageOnce(buildId: string, page: number): Promise<{ status: number; body?: unknown; retryAfterMs?: number }> {
  const started = Date.now();
  perf.requests++;
  const response = await fetch(nextDataUrl(buildId, page), { headers: { Accept: "application/json" } });
  perf.responseTimesMs.push(Date.now() - started);
  if (response.status === 404) return { status: 404 };
  if (response.status === 429) {
    perf.rateLimited++;
    const retryAfter = response.headers.get("retry-after");
    const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : undefined;
    return { status: 429, retryAfterMs };
  }
  if (!response.ok) {
    perf.httpErrors++;
    return { status: response.status };
  }
  return { status: 200, body: await response.json() };
}

// Bounded retries with exponential backoff; 404 is returned immediately
// (not retried here) so the caller can decide whether to re-discover
// buildId - retrying a stale buildId blindly would just waste requests.
async function fetchPageWithRetry(buildId: string, page: number): Promise<FetchOutcome | { kind: "not_found" }> {
  let attempt = 0;
  for (;;) {
    const result = await fetchPageOnce(buildId, page);
    if (result.status === 404) return { kind: "not_found" };
    if (result.status === 200) {
      const body = result.body as { pageProps?: { ratingDetails?: { totalItems: number; items: RawItem[] } } };
      const details = body.pageProps?.ratingDetails;
      if (!details) throw new Error(`Page ${page}: response had no pageProps.ratingDetails`);
      return { kind: "ok", totalItems: details.totalItems, items: details.items };
    }
    attempt++;
    if (attempt > MAX_RETRIES) throw new Error(`Page ${page}: exhausted ${MAX_RETRIES} retries (last HTTP status ${result.status})`);
    perf.retries++;
    const backoff = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** (attempt - 1));
    const waitMs = result.retryAfterMs ?? backoff;
    console.log(`  page ${page}: HTTP ${result.status}, retry ${attempt}/${MAX_RETRIES} in ${waitMs}ms`);
    await sleep(waitMs);
  }
}

async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  const tmpPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(tmpPath, JSON.stringify(data), "utf8");
  await rename(tmpPath, filePath);
}

async function readCachedPage(page: number): Promise<RawItem[] | null> {
  const filePath = path.join(PAGES_DIR, `page-${String(page).padStart(4, "0")}.json`);
  if (!existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as { items: RawItem[] };
    if (!Array.isArray(parsed.items)) return null;
    return parsed.items;
  } catch {
    return null; // corrupt/partial cache file - refetch this page
  }
}

async function main() {
  await mkdir(PAGES_DIR, { recursive: true });
  await mkdir(RAW_DIR, { recursive: true });
  await mkdir(NORMALIZED_DIR, { recursive: true });

  perf.startedAt = Date.now();
  console.log("Discovering current EA buildId...");
  let buildId = await discoverBuildId();
  let rediscoveredThisRun = false;
  console.log(`buildId = ${buildId}`);

  console.log("Fetching page 1 to discover totalItems/pageCount...");
  const first = await fetchPageWithRetry(buildId, 1);
  if (first.kind !== "ok") throw new Error("Page 1 returned 404 immediately after discovering buildId - EA route shape may have changed");
  const totalItems = first.totalItems;
  const pageSize = first.items.length;
  const pageCount = Math.ceil(totalItems / pageSize);
  console.log(`totalItems=${totalItems} pageSize=${pageSize} pageCount=${pageCount}`);

  await writeJsonAtomic(STATE_PATH, { buildId, totalItems, pageSize, pageCount, startedAt: new Date(perf.startedAt).toISOString() });
  await writeJsonAtomic(path.join(PAGES_DIR, "page-0001.json"), { page: 1, items: first.items });

  for (let page = 2; page <= pageCount; page++) {
    const cached = await readCachedPage(page);
    if (cached) {
      console.log(`page ${page}/${pageCount}: cached (${cached.length} items) - skipping`);
      continue;
    }
    await sleep(REQUEST_DELAY_MS);
    let outcome = await fetchPageWithRetry(buildId, page);
    if (outcome.kind === "not_found") {
      if (rediscoveredThisRun) throw new Error(`Page ${page}: 404 after buildId was already re-discovered once this run - aborting rather than looping`);
      console.log(`page ${page}: 404 - buildId may have changed, re-discovering once...`);
      buildId = await discoverBuildId();
      rediscoveredThisRun = true;
      await writeJsonAtomic(STATE_PATH, { buildId, totalItems, pageSize, pageCount, startedAt: new Date(perf.startedAt).toISOString(), rediscoveredAt: new Date().toISOString() });
      outcome = await fetchPageWithRetry(buildId, page);
      if (outcome.kind === "not_found") throw new Error(`Page ${page}: still 404 after buildId re-discovery - aborting`);
    }
    await writeJsonAtomic(path.join(PAGES_DIR, `page-${String(page).padStart(4, "0")}.json`), { page, items: outcome.items });
    console.log(`page ${page}/${pageCount}: ${outcome.items.length} items`);
  }
  perf.finishedAt = Date.now();

  console.log("Merging cached pages into the raw snapshot...");
  const pageFiles = (await readdir(PAGES_DIR)).filter((name) => name.endsWith(".json")).sort();
  const items: RawItem[] = [];
  for (const name of pageFiles) {
    const parsed = JSON.parse(await readFile(path.join(PAGES_DIR, name), "utf8")) as { items: RawItem[] };
    items.push(...parsed.items);
  }

  const retrievedAt = new Date().toISOString();
  const dateStamp = retrievedAt.slice(0, 10);
  const rawSnapshot = {
    source: RATINGS_PAGE_URL,
    nextDataUrlTemplate: nextDataUrl("{buildId}", 0).replace("page=0", "page={page}"),
    retrievedAt,
    eaBuildId: buildId,
    totalItems,
    pageSize,
    pageCount,
    itemCount: items.length,
    items,
  };
  const rawPath = path.join(RAW_DIR, `ea-ratings-${dateStamp}.json`);
  await writeJsonAtomic(rawPath, rawSnapshot);

  console.log("Normalizing...");
  const normalized = items.map((item) => normalizePlayer(item, buildId, retrievedAt));
  const normalizedSnapshot = { generatedAt: retrievedAt, sourceRawFile: path.relative(OUT_ROOT, rawPath), eaBuildId: buildId, count: normalized.length, players: normalized };
  const normalizedPath = path.join(NORMALIZED_DIR, "fc27-players.json");
  await writeJsonAtomic(normalizedPath, normalizedSnapshot);

  console.log("Running data-quality analysis...");
  const report = buildReport(items, normalized, { rawPath, normalizedPath, retrievedAt, buildId, totalItems, pageCount });
  const reportPath = path.join(NORMALIZED_DIR, "fc27-players.report.json");
  await writeJsonAtomic(reportPath, report);

  const rawBuf = await readFile(rawPath);
  const normalizedBuf = await readFile(normalizedPath);
  console.log(JSON.stringify({
    raw: { path: rawPath, bytes: rawBuf.length, sha256: createHash("sha256").update(rawBuf).digest("hex") },
    normalized: { path: normalizedPath, bytes: normalizedBuf.length, sha256: createHash("sha256").update(normalizedBuf).digest("hex") },
    report: reportPath,
    performance: {
      requests: perf.requests, retries: perf.retries, rateLimited: perf.rateLimited, httpErrors: perf.httpErrors,
      durationMs: perf.finishedAt - perf.startedAt,
      avgResponseMs: perf.responseTimesMs.length ? Math.round(perf.responseTimesMs.reduce((a, b) => a + b, 0) / perf.responseTimesMs.length) : null,
    },
  }, null, 2));
}

function statPair(stat: RawStats[string]): StatPair | null {
  if (!stat || typeof stat.value !== "number") return null;
  return { value: stat.value, diff: typeof stat.diff === "number" ? stat.diff : 0 };
}

function slugifyName(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizePlayer(item: RawItem, buildId: string, retrievedAt: string) {
  const displayName = item.commonName || `${item.firstName} ${item.lastName}`.trim();
  const slug = `${slugifyName(displayName) || "player"}-${item.id}`;
  const s = item.stats || {};
  return {
    identity: {
      ea_player_id: item.id,
      first_name: item.firstName,
      last_name: item.lastName,
      common_name: item.commonName,
      display_name: displayName,
      slug,
    },
    ratings: { overall: item.overallRating, rank: item.rank },
    position: {
      position_id: item.position?.id ?? null,
      position: item.position?.shortLabel ?? null,
      position_label: item.position?.label ?? null,
      position_type_id: item.position?.positionType?.id ?? null,
      position_type_name: item.position?.positionType?.name ?? null,
      alternate_positions: (item.alternatePositions ?? []).map((p) => ({ id: p.id, label: p.label, short_label: p.shortLabel })),
    },
    affiliation: {
      nationality_id: item.nationality?.id ?? null,
      nationality_name: item.nationality?.label ?? null,
      nationality_image_url: item.nationality?.imageUrl ?? null,
      club_id: item.team?.id ?? null,
      club_name: item.team?.label ?? null,
      club_image_url: item.team?.imageUrl ?? null,
      club_is_popular: item.team?.isPopular ?? null,
      league_name: item.leagueName,
    },
    face_stats: {
      pace: statPair(s.pac), shooting: statPair(s.sho), passing: statPair(s.pas),
      dribbling: statPair(s.dri), defending: statPair(s.def), physicality: statPair(s.phy),
    },
    detailed_attributes: {
      acceleration: statPair(s.acceleration), sprint_speed: statPair(s.sprintSpeed),
      positioning: statPair(s.positioning), finishing: statPair(s.finishing), shot_power: statPair(s.shotPower),
      long_shots: statPair(s.longShots), volleys: statPair(s.volleys), penalties: statPair(s.penalties),
      vision: statPair(s.vision), crossing: statPair(s.crossing), free_kick_accuracy: statPair(s.freeKickAccuracy),
      short_passing: statPair(s.shortPassing), long_passing: statPair(s.longPassing), curve: statPair(s.curve),
      agility: statPair(s.agility), balance: statPair(s.balance), reactions: statPair(s.reactions),
      ball_control: statPair(s.ballControl), dribbling: statPair(s.dribbling), composure: statPair(s.composure),
      interceptions: statPair(s.interceptions), heading_accuracy: statPair(s.headingAccuracy),
      defensive_awareness: statPair(s.defensiveAwareness), standing_tackle: statPair(s.standingTackle),
      sliding_tackle: statPair(s.slidingTackle), jumping: statPair(s.jumping), stamina: statPair(s.stamina),
      strength: statPair(s.strength), aggression: statPair(s.aggression),
    },
    goalkeeping: {
      gk_diving: statPair(s.gkDiving), gk_handling: statPair(s.gkHandling), gk_kicking: statPair(s.gkKicking),
      gk_positioning: statPair(s.gkPositioning), gk_reflexes: statPair(s.gkReflexes),
    },
    bio: {
      skill_moves_raw: item.skillMoves,
      weak_foot: item.weakFootAbility,
      // No authoritative EA enum mapping was found for preferredFoot (see
      // investigation notes) - the raw code is preserved and the label is
      // deliberately left null rather than guessed.
      preferred_foot_code: item.preferredFoot,
      preferred_foot_label: null,
      height_raw: item.height,
      weight_raw: item.weight,
      birthdate_raw: item.birthdate,
      gender_id: item.gender?.id ?? null,
      gender_label: item.gender?.label ?? null,
    },
    media: {
      avatar_url: item.avatarUrl,
      shield_url: item.shieldUrl,
      // Derived, NOT EA's own slug (EA doesn't expose one on this
      // endpoint) - may not exactly match EA's real ratings-page URL for
      // names with unusual characters. Good enough as a working link, not
      // guaranteed byte-identical to EA's canonical URL.
      player_detail_url_derived: `${ORIGIN}/en/games/ea-sports-fc/ratings/player-ratings/${slugifyName(displayName) || "player"}/${item.id}`,
    },
    player_abilities_raw: item.playerAbilities ?? [],
    source: { ea_build_id: buildId, retrieved_at: retrievedAt },
  };
}

type NormalizedPlayer = ReturnType<typeof normalizePlayer>;

function fieldStat(values: Array<unknown>, isEmpty: (v: unknown) => boolean) {
  const total = values.length;
  const empty = values.filter(isEmpty).length;
  const populated = total - empty;
  return { populated, empty, populated_pct: total ? Math.round((populated / total) * 10000) / 100 : 0 };
}

function buildReport(raw: RawItem[], normalized: NormalizedPlayer[], meta: { rawPath: string; normalizedPath: string; retrievedAt: string; buildId: string; totalItems: number; pageCount: number }) {
  const ids = raw.map((r) => r.id);
  const idSet = new Set(ids);
  const idCounts = new Map<number, number>();
  for (const id of ids) idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  const duplicateIds = [...idCounts.entries()].filter(([, count]) => count > 1);

  const ranks = raw.map((r) => r.rank).sort((a, b) => a - b);
  const rankSet = new Set(ranks);
  const rankDuplicates = ranks.length - rankSet.size;
  const expectedRanks = new Set(Array.from({ length: raw.length }, (_, i) => i + 1));
  const missingRanks: number[] = [];
  for (const expected of expectedRanks) if (!rankSet.has(expected)) missingRanks.push(expected);

  const overallValues = raw.map((r) => r.overallRating).filter((v): v is number => typeof v === "number");

  const skillMovesDist = new Map<string, number>();
  for (const r of raw) { const key = String(r.skillMoves); skillMovesDist.set(key, (skillMovesDist.get(key) ?? 0) + 1); }

  const preferredFootDist = new Map<string, number>();
  for (const r of raw) { const key = String(r.preferredFoot); preferredFootDist.set(key, (preferredFootDist.get(key) ?? 0) + 1); }

  const withAbilities = raw.filter((r) => Array.isArray(r.playerAbilities) && r.playerAbilities.length > 0);
  const abilityShapes = new Set<string>();
  for (const r of withAbilities) for (const a of r.playerAbilities) abilityShapes.add(JSON.stringify(a));

  const positionDist = new Map<string, number>();
  for (const r of raw) { const key = r.position?.shortLabel ?? "(null)"; positionDist.set(key, (positionDist.get(key) ?? 0) + 1); }

  const leagueDist = new Map<string, number>();
  for (const r of raw) { const key = r.leagueName ?? "(null)"; leagueDist.set(key, (leagueDist.get(key) ?? 0) + 1); }

  const fields: Record<string, ReturnType<typeof fieldStat>> = {
    ea_player_id: fieldStat(ids, (v) => v == null),
    name: fieldStat(raw.map((r) => `${r.firstName} ${r.lastName}`.trim()), (v) => !v),
    overall: fieldStat(raw.map((r) => r.overallRating), (v) => typeof v !== "number"),
    height: fieldStat(raw.map((r) => r.height), (v) => !v),
    weight: fieldStat(raw.map((r) => r.weight), (v) => !v),
    birthdate: fieldStat(raw.map((r) => r.birthdate), (v) => !v),
    common_name: fieldStat(raw.map((r) => r.commonName), (v) => !v),
    skill_moves: fieldStat(raw.map((r) => r.skillMoves), (v) => v == null),
    weak_foot: fieldStat(raw.map((r) => r.weakFootAbility), (v) => v == null),
    preferred_foot: fieldStat(raw.map((r) => r.preferredFoot), (v) => v == null),
    league_name: fieldStat(raw.map((r) => r.leagueName), (v) => !v),
    position_id: fieldStat(raw.map((r) => r.position?.id), (v) => v == null),
    nationality_id: fieldStat(raw.map((r) => r.nationality?.id), (v) => v == null),
    club_id: fieldStat(raw.map((r) => r.team?.id), (v) => v == null),
    alternate_positions: fieldStat(raw.map((r) => r.alternatePositions), (v) => !Array.isArray(v) || v.length === 0),
    player_abilities: fieldStat(raw.map((r) => r.playerAbilities), (v) => !Array.isArray(v) || v.length === 0),
    avatar_url: fieldStat(raw.map((r) => r.avatarUrl), (v) => !v),
    shield_url: fieldStat(raw.map((r) => r.shieldUrl), (v) => !v),
    gk_diving: fieldStat(raw.map((r) => r.stats?.gkDiving?.value), (v) => v == null),
    gk_handling: fieldStat(raw.map((r) => r.stats?.gkHandling?.value), (v) => v == null),
    gk_kicking: fieldStat(raw.map((r) => r.stats?.gkKicking?.value), (v) => v == null),
    gk_positioning: fieldStat(raw.map((r) => r.stats?.gkPositioning?.value), (v) => v == null),
    gk_reflexes: fieldStat(raw.map((r) => r.stats?.gkReflexes?.value), (v) => v == null),
  };

  return {
    meta,
    integrity: {
      total_records: raw.length,
      unique_ea_ids: idSet.size,
      duplicate_ea_ids: duplicateIds.map(([id, count]) => ({ id, count })),
      rank_min: ranks[0] ?? null,
      rank_max: ranks[ranks.length - 1] ?? null,
      rank_duplicates: rankDuplicates,
      rank_missing_count: missingRanks.length,
      rank_missing_sample: missingRanks.slice(0, 20),
      overall_min: overallValues.length ? Math.min(...overallValues) : null,
      overall_max: overallValues.length ? Math.max(...overallValues) : null,
      ids_equal_distinct_ids: ids.length === idSet.size,
    },
    field_quality: fields,
    skill_moves_distribution: Object.fromEntries([...skillMovesDist.entries()].sort()),
    preferred_foot_distribution: Object.fromEntries([...preferredFootDist.entries()].sort()),
    player_abilities: {
      players_with_empty_array: raw.length - withAbilities.length,
      players_with_nonempty_array: withAbilities.length,
      distinct_ability_shapes: abilityShapes.size,
      sample_shapes: [...abilityShapes].slice(0, 10),
    },
    position_distribution: Object.fromEntries([...positionDist.entries()].sort((a, b) => b[1] - a[1])),
    league_distribution_top20: Object.fromEntries([...leagueDist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)),
    league_distinct_count: leagueDist.size,
  };
}

await main();
