import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fetchPlayers } from "./players.ts";

// Regression coverage for the reported bug: Squad Builder search (and the
// "Replace" popup / Auto Build, which share this same fetchPlayers() call)
// returned "No players found" for Caroline Graham Hansen and Claudia Pina
// even though both exist in the source database. Root cause: the search
// path fanned out to ~160 shard files via getAllPlayersStatic(), and a
// tolerated shard failure silently dropped every player in that shard. The
// fix moves search onto the single pre-built search/index.json - these
// tests run against the real local dataset (not a synthetic fixture) so
// they exercise the actual production data, not just the code shape.

async function findRealPlayer(genderLabel, excludeIds) {
  const manifest = JSON.parse(await readFile(path.join(process.cwd(), "public", "fc27-data", "manifest.json"), "utf8"));
  const index = JSON.parse(await readFile(path.join(process.cwd(), "public", "fc27-data", manifest.datasetVersion, "search", "index.json"), "utf8"));
  const row = index.find((p) => p.gender_label === genderLabel && !excludeIds.includes(p.ea_player_id));
  if (!row) throw new Error(`no player with gender_label=${genderLabel} found in the local dataset`);
  return row;
}

test("empty query, no filters returns a large paginated result (Squad Builder's default 'browse everyone' state)", async () => {
  const result = await fetchPlayers({});
  assert.ok(result.total > 20000, `expected >20000 total players, got ${result.total}`);
  assert.ok(result.players.length > 0);
});

test('search "Hansen" finds Caroline Graham Hansen (227102)', async () => {
  const result = await fetchPlayers({ q: "Hansen" });
  assert.ok(result.players.some((p) => p.ea_player_id === 227102), "Caroline Graham Hansen missing from 'Hansen' search results");
});

test('search "Caroline Graham Hansen" (full name) finds her', async () => {
  const result = await fetchPlayers({ q: "Caroline Graham Hansen" });
  assert.ok(result.players.some((p) => p.ea_player_id === 227102));
});

test('search "Pina" finds Claudia Pina (262531) among results', async () => {
  const result = await fetchPlayers({ q: "Pina" });
  assert.ok(result.players.some((p) => p.ea_player_id === 262531), "Claudia Pina missing from 'Pina' search results");
});

test('search "Claudia Pina" finds her precisely', async () => {
  const result = await fetchPlayers({ q: "Claudia Pina" });
  assert.ok(result.players.some((p) => p.ea_player_id === 262531));
});

test('search "Clàudia Pina" (accented) still finds her via accent folding', async () => {
  const result = await fetchPlayers({ q: "Clàudia Pina" });
  assert.ok(result.players.some((p) => p.ea_player_id === 262531), "accented query 'Clàudia Pina' did not match Claudia Pina");
});

test("both a female and a male player (dynamically sampled from the real dataset) are present and individually searchable", async () => {
  const woman = await findRealPlayer("Women's Football", [227102, 262531]);
  const man = await findRealPlayer("Men's Football", []);
  assert.notEqual(woman.gender_label, man.gender_label);

  const womenResult = await fetchPlayers({ q: woman.display_name });
  assert.ok(womenResult.players.some((p) => p.ea_player_id === woman.ea_player_id), `female player "${woman.display_name}" (${woman.ea_player_id}) not found by name search`);

  const menResult = await fetchPlayers({ q: man.display_name });
  assert.ok(menResult.players.some((p) => p.ea_player_id === man.ea_player_id), `male player "${man.display_name}" (${man.ea_player_id}) not found by name search`);
});

test("position filter narrows results without dropping the target player when her position is requested", async () => {
  const result = await fetchPlayers({ q: "Pina", position: "LW" });
  assert.ok(result.players.some((p) => p.ea_player_id === 262531));
});
