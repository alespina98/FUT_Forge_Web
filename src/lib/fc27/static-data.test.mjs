import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Reproduces the production regression: getAllPlayersStatic() (used by the FC27
// Auto Build filter-options endpoint) fans out to every shard file at once.
// Two failure modes were fixed:
// 1. A failed artifact read used to be cached forever at module scope - every
//    subsequent request kept rejecting even though the file was fine. json()
//    now evicts a rejected promise from jsonCache so the next call retries.
// 2. Even with retries, production still saw ~1 shard out of 160+ fail
//    intermittently (a different one each time) - getAllPlayersStatic() no
//    longer lets one bad shard 500 the whole endpoint; it skips it and
//    returns the rest, self-healing on the next cold start/isolate once the
//    shard is reachable again.

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

test("getAllPlayersStatic() tolerates one unavailable shard instead of failing the whole endpoint", async () => {
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
    // shard-001.json intentionally left missing.

    const mod = await freshModule(dir);
    const players = await mod.getAllPlayersStatic();
    assert.deepEqual(players.map((p) => p.ea_player_id), [1]);

    // Within the same module instance (~one warm isolate) the aggregate is
    // cached, so the gap persists until the next cold start - that's the
    // deliberate availability-over-completeness tradeoff.
    await writeFile(shard1Path, JSON.stringify([{ ea_player_id: 2 }]));
    const stillOne = await mod.getAllPlayersStatic();
    assert.deepEqual(stillOne.map((p) => p.ea_player_id), [1]);

    // A fresh module instance (simulating the next cold start/isolate) picks
    // up the now-available shard.
    const fresh = await freshModule(dir);
    const healed = await fresh.getAllPlayersStatic();
    assert.deepEqual(healed.map((p) => p.ea_player_id).sort(), [1, 2]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
