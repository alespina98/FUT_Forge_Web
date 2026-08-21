// FC27 players importer - reads the local normalized snapshot produced by
// download-ea-ratings.ts and syncs it into Supabase's public.fc27_players
// (schema: supabase/migrations/0008_fc27_database.sql).
//
// Change detection: each row's data_hash is a sha256 of its own canonical
// EA-sourced fields (created_at/updated_at excluded). Existing hashes are
// fetched once up front; a row is only sent to Supabase if it's new or its
// hash changed, so re-running this script after a no-op EA sync costs one
// read and zero writes.
//
// Usage:
//   npm run fc27:sync -- --dry-run          # validate + hash, no writes
//   npm run fc27:sync -- --dry-run --limit 10
//   npm run fc27:sync                        # real import, requires SUPABASE_SERVICE_ROLE_KEY
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://axjuxmjoowrzmvyhbdhv.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_bMremihmEy34CWp5rG6M-g_UuysymCX";
const SNAPSHOT_PATH = "data/fc27/normalized/fc27-players.json";
const SYNC_SOURCE = "ea_ratings";
const BATCH_SIZE = 500;

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit"));
const limit = limitArg ? Number(limitArg.includes("=") ? limitArg.split("=")[1] : args[args.indexOf(limitArg) + 1]) : undefined;

type NormalizedPlayer = {
  identity: { ea_player_id: number; first_name: string; last_name: string; common_name: string | null; display_name: string; slug: string };
  ratings: { overall: number; rank: number };
  position: { position_id: string | null; position: string | null; position_label: string | null; position_type_id: string | null; position_type_name: string | null; alternate_positions: unknown[] };
  affiliation: { nationality_id: number | null; nationality_name: string | null; nationality_image_url: string | null; club_id: number | null; club_name: string | null; club_image_url: string | null; club_is_popular: boolean | null; league_name: string | null };
  face_stats: Record<string, { value: number; diff: number } | null>;
  detailed_attributes: Record<string, unknown>;
  goalkeeping: Record<string, unknown>;
  bio: { skill_moves_raw: number | null; weak_foot: number | null; preferred_foot_code: number | null; preferred_foot_label: null; height_raw: string; weight_raw: string; birthdate_raw: string | null };
  media: { avatar_url: string | null; shield_url: string | null };
  player_abilities_raw: unknown[];
  source: { ea_build_id: string; retrieved_at: string };
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`).join(",")}}`;
}

function dataHash(row: Record<string, unknown>): string {
  return createHash("sha256").update(stableStringify(row)).digest("hex");
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return String(error);
}

// "M/D/YYYY 0:00" -> "YYYY-MM-DD". Validated against all 20,689 records
// (see the Step 3 birthdate audit): month never exceeds 12, day does in
// 12,301 cases, so the order is unambiguously month/day/year.
function birthdateToIso(raw: string | null): string | null {
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s/);
  if (!match) return null;
  const [, m, d, y] = match;
  const month = Number(m);
  const day = Number(d);
  const year = Number(y);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Always '' in the current EA snapshot. Best-effort numeric parse so a
// future non-empty value isn't silently dropped, without pretending to
// know EA's eventual format/units.
function numericOrNull(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

// Accent-fold via Unicode NFD decomposition + combining-mark strip, no
// PostgreSQL unaccent extension involved. "Mbappé" -> "mbappe",
// "João" -> "joao", "Güler" -> "guler", "Modrić" -> "modric".
function foldAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// search_text: the accent-folded, lowercased, whitespace-normalized
// concatenation of every field search_document indexes (see migration
// 0008's comment on this column). Built from the already-constructed row
// so the field list can never drift out of sync with what's actually in
// the row. display_name/first_name/last_name are always populated, so the
// result is never empty even when every optional field is null.
function buildSearchText(row: Record<string, unknown>): string {
  const parts = [
    row.display_name, row.first_name, row.last_name, row.common_name,
    row.nationality_name, row.club_name, row.league_name,
    row.position_short_label, row.position_label,
  ];
  const folded = parts.filter((p): p is string => typeof p === "string" && p.length > 0).map(foldAccents);
  return folded.join(" ").replace(/\s+/g, " ").trim();
}

type TransformResult = { ok: true; row: Record<string, unknown> } | { ok: false; ea_player_id: unknown; reason: string };

function transform(player: NormalizedPlayer): TransformResult {
  const id = player.identity.ea_player_id;
  if (typeof id !== "number" || !Number.isFinite(id)) return { ok: false, ea_player_id: id, reason: "missing/invalid ea_player_id" };
  const birthdate = birthdateToIso(player.bio.birthdate_raw);
  if (!birthdate) return { ok: false, ea_player_id: id, reason: `unparseable birthdate: ${player.bio.birthdate_raw}` };
  if (typeof player.ratings.overall !== "number") return { ok: false, ea_player_id: id, reason: "missing overall" };
  if (!player.position.position_id) return { ok: false, ea_player_id: id, reason: "missing position_id" };
  if (player.affiliation.nationality_id == null) return { ok: false, ea_player_id: id, reason: "missing nationality_id" };
  if (player.bio.skill_moves_raw == null) return { ok: false, ea_player_id: id, reason: "missing skill_moves_raw" };
  if (player.bio.weak_foot == null) return { ok: false, ea_player_id: id, reason: "missing weak_foot" };
  // Presence-only check, deliberately not restricted to {1,2}: the raw EA
  // code is preserved as-is (see migration 0008's comment on this column)
  // rather than treated as a closed enum, so a future third value is
  // still imported, not rejected as a transformation failure.
  if (player.bio.preferred_foot_code == null || player.bio.preferred_foot_code < 0) return { ok: false, ea_player_id: id, reason: `missing/invalid preferred_foot_code: ${player.bio.preferred_foot_code}` };

  const face = player.face_stats;
  const row: Record<string, unknown> = {
    ea_player_id: id,
    slug: player.identity.slug,
    first_name: player.identity.first_name,
    last_name: player.identity.last_name,
    common_name: player.identity.common_name,
    display_name: player.identity.display_name,
    overall: player.ratings.overall,
    rank: player.ratings.rank,
    pace: face.pace?.value ?? null,
    shooting: face.shooting?.value ?? null,
    passing: face.passing?.value ?? null,
    dribbling: face.dribbling?.value ?? null,
    defending: face.defending?.value ?? null,
    physicality: face.physicality?.value ?? null,
    face_stat_diffs: {
      pace: face.pace?.diff ?? 0, shooting: face.shooting?.diff ?? 0, passing: face.passing?.diff ?? 0,
      dribbling: face.dribbling?.diff ?? 0, defending: face.defending?.diff ?? 0, physicality: face.physicality?.diff ?? 0,
    },
    position_id: player.position.position_id,
    position_short_label: player.position.position,
    position_label: player.position.position_label,
    position_type_id: player.position.position_type_id,
    position_type_name: player.position.position_type_name,
    alternate_positions: player.position.alternate_positions,
    nationality_id: player.affiliation.nationality_id,
    nationality_name: player.affiliation.nationality_name,
    nationality_image_url: player.affiliation.nationality_image_url,
    club_id: player.affiliation.club_id,
    club_name: player.affiliation.club_name,
    club_image_url: player.affiliation.club_image_url,
    club_is_popular: player.affiliation.club_is_popular,
    // Source sends "" (not null) for the 620 players with no league - only
    // field observed to do this (checked common_name/club_name/club_image_url/
    // nationality_image_url/position_type_*/avatar_url/shield_url, all
    // correctly null already) - normalized the same way height/weight are.
    league_name: player.affiliation.league_name || null,
    birthdate,
    skill_moves_raw: player.bio.skill_moves_raw,
    weak_foot: player.bio.weak_foot,
    preferred_foot_code: player.bio.preferred_foot_code,
    height_cm: numericOrNull(player.bio.height_raw),
    weight_kg: numericOrNull(player.bio.weight_raw),
    detailed_attributes: player.detailed_attributes,
    goalkeeping: player.goalkeeping,
    player_abilities_raw: player.player_abilities_raw,
    avatar_url: player.media.avatar_url,
    shield_url: player.media.shield_url,
    source_ea_build_id: player.source.ea_build_id,
    source_retrieved_at: player.source.retrieved_at,
  };
  try {
    JSON.stringify(row);
  } catch (error) {
    return { ok: false, ea_player_id: id, reason: `JSON serialization failed: ${errorMessage(error)}` };
  }
  // Hashed BEFORE search_text is attached, so a future change to the
  // normalization algorithm alone never triggers a spurious UPDATE across
  // all 20,689 rows - only a genuine change to an underlying EA field
  // does, and that same field is already part of the hashed row above.
  // search_text is still recomputed fresh on every transform() call (this
  // isn't an incremental script - it re-derives every row every run), so
  // it never goes stale relative to the row it's attached to.
  row.data_hash = dataHash(row);
  row.search_text = buildSearchText(row);
  return { ok: true, row };
}

async function main() {
  console.log(`Reading ${SNAPSHOT_PATH}...`);
  const snapshotRaw = await readFile(SNAPSHOT_PATH, "utf8");
  const snapshotSha256 = createHash("sha256").update(snapshotRaw).digest("hex");
  const snapshot = JSON.parse(snapshotRaw) as { players: NormalizedPlayer[]; count: number };
  let players = snapshot.players;
  if (limit) players = players.slice(0, limit);
  console.log(`discovered=${players.length}${limit ? ` (limited from ${snapshot.players.length})` : ""}`);

  const seenIds = new Set<number>();
  const duplicates: number[] = [];
  const failures: Array<{ ea_player_id: unknown; reason: string }> = [];
  const rows: Record<string, unknown>[] = [];
  for (const player of players) {
    const result = transform(player);
    if (!result.ok) {
      failures.push({ ea_player_id: result.ea_player_id, reason: result.reason });
      continue;
    }
    const id = result.row.ea_player_id as number;
    if (seenIds.has(id)) { duplicates.push(id); continue; } // excluded, not just logged - a duplicate PK in the same upsert batch would error
    seenIds.add(id);
    rows.push(result.row);
  }
  console.log(`valid=${rows.length} failed=${failures.length} duplicate_pks=${duplicates.length}`);
  if (failures.length) console.log("sample failures:", failures.slice(0, 10));
  if (duplicates.length) console.log("duplicate ea_player_ids:", duplicates.slice(0, 10));

  const clientKey = isDryRun ? SUPABASE_ANON_KEY : process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isDryRun && !clientKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY is required for a real (non-dry-run) import.");
    process.exitCode = 1;
    return;
  }
  const client = createClient(SUPABASE_URL, clientKey!, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log("Fetching existing ea_player_id/data_hash pairs for change detection...");
  const existing = new Map<number, string>();
  let existingReadOk = true;
  try {
    // Advance by the ACTUAL row count returned, not an assumed page size:
    // PostgREST's real per-request row cap is a project-level setting that
    // can be smaller than the 1000 requested here, and terminating on
    // "got fewer than 1000" would silently truncate this comparison on a
    // project configured with a smaller cap. count:"exact" gives a real
    // stopping condition independent of whatever the page size turns out
    // to be.
    // Note: a HEAD/count request against a table that doesn't exist yet
    // does NOT surface as `error` here - PostgREST/supabase-js returns
    // {status:204, count:null, error:null} for that case (verified
    // directly), indistinguishable from a real empty table unless `count`
    // itself is checked for null. A genuinely empty existing table returns
    // {status:200, count:0}, so `count === null` is the real failure signal.
    const { count, error: countError } = await client.from("fc27_players").select("ea_player_id", { count: "exact", head: true });
    if (countError) throw countError;
    if (count === null) throw new Error("fc27_players count came back null - table likely does not exist yet");
    const total = count;
    let from = 0;
    while (from < total) {
      const { data, error } = await client.from("fc27_players").select("ea_player_id,data_hash").range(from, from + 999);
      if (error) throw error;
      if (!data || data.length === 0) break; // defensive: stop rather than loop forever if count() and the actual rows disagree
      for (const row of data) existing.set(row.ea_player_id as number, row.data_hash as string);
      from += data.length;
    }
    console.log(`existing rows in Supabase: ${existing.size}`);
  } catch (error) {
    existingReadOk = false;
    console.log(`Could not read existing fc27_players (expected before the migration is applied): ${errorMessage(error)}`);
    console.log("Treating every valid record as a provisional INSERT candidate.");
  }

  let inserted = 0, updated = 0, unchanged = 0;
  const toWrite: Record<string, unknown>[] = [];
  for (const row of rows) {
    const id = row.ea_player_id as number;
    const existingHash = existing.get(id);
    if (existingHash === undefined) { inserted++; toWrite.push(row); }
    else if (existingHash !== row.data_hash) { updated++; toWrite.push(row); }
    else unchanged++;
  }
  console.log(`projected inserted=${inserted} updated=${updated} unchanged=${unchanged}${existingReadOk ? "" : " (provisional - no existing state to compare against)"}`);

  if (isDryRun) {
    console.log(JSON.stringify({ dryRun: true, discovered: players.length, valid: rows.length, failed: failures.length, duplicates: duplicates.length, projected: { inserted, updated, unchanged } }, null, 2));
    return;
  }

  const startedAt = new Date().toISOString();
  await client.from("fc27_sync_state").upsert({
    source: SYNC_SOURCE, ea_build_id: rows[0]?.source_ea_build_id ?? null, snapshot_sha256: snapshotSha256, last_started_at: startedAt,
    discovered_count: players.length, status: "running", message: null,
  }, { onConflict: "source" });

  console.log(`Writing ${toWrite.length} changed/new rows in batches of ${BATCH_SIZE}...`);
  let failed = 0;
  for (let i = 0; i < toWrite.length; i += BATCH_SIZE) {
    const batch = toWrite.slice(i, i + BATCH_SIZE);
    const { error } = await client.from("fc27_players").upsert(batch, { onConflict: "ea_player_id" });
    if (error) {
      failed += batch.length;
      console.log(`batch ${i / BATCH_SIZE + 1}: FAILED (${batch.length} rows) - ${error.message}`);
    } else {
      console.log(`batch ${i / BATCH_SIZE + 1}: wrote ${batch.length} rows (${Math.min(i + BATCH_SIZE, toWrite.length)}/${toWrite.length})`);
    }
  }

  const completedAt = new Date().toISOString();
  const status = failed > 0 || failures.length > 0 ? "failed" : "succeeded";
  await client.from("fc27_sync_state").upsert({
    source: SYNC_SOURCE, ea_build_id: rows[0]?.source_ea_build_id ?? null, snapshot_sha256: snapshotSha256, last_started_at: startedAt, last_completed_at: completedAt,
    discovered_count: players.length, inserted_count: inserted, updated_count: updated, unchanged_count: unchanged,
    failed_count: failed + failures.length, status, message: failures.length ? `${failures.length} records failed transformation` : null,
  }, { onConflict: "source" });

  console.log(JSON.stringify({ discovered: players.length, inserted, updated, unchanged, failed: failed + failures.length, status }, null, 2));
  if (status === "failed") process.exitCode = 1;
}

await main();
