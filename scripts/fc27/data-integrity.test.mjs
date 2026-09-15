import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Guards against a whole class of "player silently missing from Squad
// Builder" regressions: compares the source catalog (players/index.json -
// every ea_player_id EA shipped, mapped to its shard) against the search
// index (search/index.json - what Squad Builder search, the Replace
// popup, and Auto Build's candidate pool actually query). These are both
// generated from the exact same in-memory player list in one run of
// generate-public-data.ts, so in a correct build they must be identical
// sets - any drift means a real player is unreachable from the product
// despite existing in the source database.

const publicRoot = path.join(process.cwd(), "public", "fc27-data");

async function loadDataset() {
  const manifest = JSON.parse(await readFile(path.join(publicRoot, "manifest.json"), "utf8"));
  const versionDir = path.join(publicRoot, manifest.datasetVersion);
  const catalogIndex = JSON.parse(await readFile(path.join(versionDir, "players", "index.json"), "utf8"));
  const searchIndex = JSON.parse(await readFile(path.join(versionDir, "search", "index.json"), "utf8"));
  const playStyleCatalog = JSON.parse(await readFile(path.join(versionDir, "playstyles", "catalog.json"), "utf8"));
  const playStyleIndex = JSON.parse(await readFile(path.join(versionDir, "playstyles", "index.json"), "utf8"));
  return { manifest, catalogIndex, searchIndex, playStyleCatalog, playStyleIndex };
}

test("search/index.json contains exactly the same player IDs as the source catalog (players/index.json)", async () => {
  const { manifest, catalogIndex, searchIndex } = await loadDataset();
  const catalogIds = new Set(Object.keys(catalogIndex).map(Number));
  const searchIds = new Set(searchIndex.map((row) => row.ea_player_id));

  assert.equal(catalogIds.size, manifest.playerCount, "players/index.json count does not match manifest.playerCount");

  const missingFromSearch = [...catalogIds].filter((id) => !searchIds.has(id));
  const extraInSearch = [...searchIds].filter((id) => !catalogIds.has(id));

  assert.deepEqual(
    missingFromSearch,
    [],
    `${missingFromSearch.length} player id(s) exist in the source catalog but are unreachable from Squad Builder search/Auto Build: ${missingFromSearch.slice(0, 20).join(", ")}${missingFromSearch.length > 20 ? "…" : ""}`,
  );
  assert.deepEqual(extraInSearch, [], `${extraInSearch.length} player id(s) in search/index.json do not exist in the source catalog: ${extraInSearch.slice(0, 20).join(", ")}`);
});

test("FC27 PlayStyle catalog and inverted index are complete and identify known players", async () => {
  const { manifest, catalogIndex, playStyleCatalog, playStyleIndex } = await loadDataset();
  assert.equal(manifest.playerCount, 19789);
  assert.equal(new Set(Object.keys(catalogIndex)).size, 19789);
  assert.equal(playStyleCatalog.filter((style) => style.tier === "base").length, 36);
  assert.equal(playStyleCatalog.filter((style) => style.tier === "plus").length, 36);

  const byLabel = new Map(playStyleCatalog.map((style) => [style.label, style.eaId]));
  for (const [label, id] of [["Quick Step+", 231747], ["Technical+", 277643], ["Finesse Shot+", 202126]]) {
    assert.ok(playStyleIndex[byLabel.get(label)]?.includes(id), `${label} missing player ${id}`);
  }
});

test("search/index.json has no duplicate player IDs", async () => {
  const { searchIndex } = await loadDataset();
  const ids = searchIndex.map((row) => row.ea_player_id);
  assert.equal(new Set(ids).size, ids.length, "search/index.json contains duplicate ea_player_id entries");
});

test("every search index row carries the fields Squad Builder/Auto Build actually need", async () => {
  const { searchIndex } = await loadDataset();
  const requiredFields = [
    "ea_player_id", "slug", "display_name", "normalized_name", "overall", "rank",
    "position_short_label", "alternate_positions",
    "nationality_id", "nationality_name",
    "club_id", "club_name", "league_name",
    "pace", "shooting", "passing", "dribbling", "defending", "physicality",
  ];
  const offenders = [];
  for (const row of searchIndex) {
    for (const field of requiredFields) {
      if (!(field in row)) { offenders.push(`${row.ea_player_id}:${field}`); break; }
    }
    if (offenders.length >= 20) break;
  }
  assert.deepEqual(offenders, [], `rows missing required fields: ${offenders.join(", ")}`);
});

test("a known real player from each gender is present and correctly indexed (regression: Caroline Graham Hansen, Claudia Pina)", async () => {
  const { searchIndex } = await loadDataset();
  const byId = new Map(searchIndex.map((row) => [row.ea_player_id, row]));

  const hansen = byId.get(227102);
  assert.ok(hansen, "Caroline Graham Hansen (227102) missing from search index");
  assert.equal(hansen.display_name, "Caroline Graham Hansen");
  assert.equal(hansen.gender_label, "Women's Football");

  const pina = byId.get(262531);
  assert.ok(pina, "Claudia Pina (262531) missing from search index");
  assert.equal(pina.display_name, "Claudia Pina");
  assert.equal(pina.gender_label, "Women's Football");

  const male = [...byId.values()].find((row) => row.gender_label !== "Women's Football");
  assert.ok(male, "no male player found in search index - gender field or dataset looks wrong");
});
