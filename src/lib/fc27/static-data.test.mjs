import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Reproduces the production regression: getAllPlayersStatic() (used by the FC27
// Auto Build filter-options endpoint) fans out to every shard file at once, and
// a single transient read failure among them used to be cached forever at module
// scope - every subsequent request kept rejecting even though the file was fine,
// which is exactly what emptied the Auto Build league/nation dropdowns in
// production. These tests assert a failed artifact read is evicted from the
// cache so the next call gets a fresh attempt instead of a poisoned promise.

async function freshModule(root) {
  process.env.FC27_STATIC_DATA_ROOT = root;
  return import(`./static-data.ts?t=${Date.now()}-${Math.random()}`);
}

test("a missing manifest self-heals once the file appears (jsonCache eviction)", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "fc27-static-manifest-"));
  try {
    const mod = await freshModule(dir);
    await assert.rejects(() => mod.getManifest(), (error) => mod.isFc27ArtifactError(error));
    await writeFile(
      path.join(dir, "manifest.json"),
      JSON.stringify({ datasetVersion: "v1", playerCount: 0, shardCount: 0, artifacts: { players: [], search: [], rankings: {}, entities: {}, positions: "", filters: "", sitemaps: [], meta: "", hiddenGems: "" } }),
    );
    const manifest = await mod.getManifest();
    assert.equal(manifest.datasetVersion, "v1");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("getAllPlayersStatic() self-heals after one shard is transiently missing", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "fc27-static-players-"));
  try {
    const version = "v1";
    await writeFile(
      path.join(dir, "manifest.json"),
      JSON.stringify({ datasetVersion: version, playerCount: 2, shardCount: 2, artifacts: { players: ["players/shard-000.json", "players/shard-001.json"], search: [], rankings: {}, entities: {}, positions: "", filters: "", sitemaps: [], meta: "", hiddenGems: "" } }),
    );
    const versionDir = path.join(dir, version, "players");
    await mkdir(versionDir, { recursive: true });
    await writeFile(path.join(versionDir, "shard-000.json"), JSON.stringify([{ ea_player_id: 1 }]));
    const shard1Path = path.join(versionDir, "shard-001.json");
    // shard-001.json intentionally left missing on the first attempt.

    const mod = await freshModule(dir);
    await assert.rejects(() => mod.getAllPlayersStatic(), (error) => mod.isFc27ArtifactError(error));

    await writeFile(shard1Path, JSON.stringify([{ ea_player_id: 2 }]));
    const players = await mod.getAllPlayersStatic();
    assert.deepEqual(players.map((p) => p.ea_player_id).sort(), [1, 2]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
