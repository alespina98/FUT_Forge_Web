import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createClient } from "@libsql/client";
// @ts-expect-error TS5097: direct Node test execution requires the extension.
import { TraderRepository } from "./repository.ts";

async function fixture() {
  const client = createClient({ url: "file::memory:" });
  for (const migration of ["0001_website_identity.sql", "0005_trader_foundations.sql"]) {
    await client.executeMultiple(await readFile(new URL(`../../../turso/migrations/${migration}`, import.meta.url), "utf8"));
  }
  const now = new Date().toISOString();
  for (const id of ["user-a", "user-b"]) {
    await client.execute({
      sql: "INSERT INTO app_users(id,email,email_normalized,username,username_normalized,role,tier,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
      args: [id, `${id}@example.com`, `${id}@example.com`, id, id, "USER", "FREE", now, now],
    });
  }
  return { client, repo: new TraderRepository(client), async close() { client.close(); } };
}

// --- consent ---------------------------------------------------------------

test("consent starts unset and is set idempotently (re-accepting overwrites, not duplicates)", async () => {
  const f = await fixture();
  try {
    assert.equal(await f.repo.getConsent("user-a"), null);
    await f.repo.setConsent("user-a", "trader-terms-v1", "ACCEPTED");
    await f.repo.setConsent("user-a", "trader-terms-v1", "ACCEPTED");
    const consent = await f.repo.getConsent("user-a");
    assert.equal(consent.decision, "ACCEPTED");
    const count = await f.client.execute("SELECT COUNT(*) AS c FROM trader_consent");
    assert.equal(Number(count.rows[0].c), 1, "re-accepting the same version must not create a second row");
  } finally {
    await f.close();
  }
});

test("consent is user-scoped", async () => {
  const f = await fixture();
  try {
    await f.repo.setConsent("user-a", "trader-terms-v1", "ACCEPTED");
    assert.equal(await f.repo.getConsent("user-b"), null);
  } finally {
    await f.close();
  }
});

// --- user settings / break settings -----------------------------------------

test("user settings upsert is idempotent and user-scoped", async () => {
  const f = await fixture();
  try {
    assert.equal(await f.repo.getUserSettings("user-a"), null);
    const value = { speedMode: "turbo", postPurchaseAction: "list", stopAfterEvent: "buys", stopAfterValue: 5, maxCardPrice: 10000, minProfitAmount: 500, minProfitPercent: 5 };
    await f.repo.upsertUserSettings("user-a", value);
    await f.repo.upsertUserSettings("user-a", value);
    assert.deepEqual(await f.repo.getUserSettings("user-a"), value);
    assert.equal(await f.repo.getUserSettings("user-b"), null);
    const count = await f.client.execute("SELECT COUNT(*) AS c FROM trader_user_settings");
    assert.equal(Number(count.rows[0].c), 1);
  } finally {
    await f.close();
  }
});

test("break settings upsert is idempotent and user-scoped", async () => {
  const f = await fixture();
  try {
    const value = { breaksAfterSearches: 50, breaksSeconds: 30, longerBreaksAfterSearches: 500, longerBreaksSeconds: 300, randomizePercent: 20 };
    await f.repo.upsertBreakSettings("user-a", value);
    await f.repo.upsertBreakSettings("user-a", value);
    assert.deepEqual(await f.repo.getBreakSettings("user-a"), value);
    assert.equal(await f.repo.getBreakSettings("user-b"), null);
  } finally {
    await f.close();
  }
});

// --- filter groups / filters -------------------------------------------------

test("filter groups: create/list/delete are user-scoped", async () => {
  const f = await fixture();
  try {
    const group = await f.repo.createFilterGroup("user-a", { name: "Cheap fodder" });
    assert.match(group.id, /^[0-9a-f-]{36}$/);
    assert.equal((await f.repo.listFilterGroups("user-a")).length, 1);
    assert.equal((await f.repo.listFilterGroups("user-b")).length, 0);
    assert.equal(await f.repo.deleteFilterGroup("user-b", group.id), false, "user-b must not be able to delete user-a's group");
    assert.equal(await f.repo.deleteFilterGroup("user-a", group.id), true);
    assert.equal((await f.repo.listFilterGroups("user-a")).length, 0);
  } finally {
    await f.close();
  }
});

test("filters: create rejects a groupId owned by another user", async () => {
  const f = await fixture();
  try {
    const group = await f.repo.createFilterGroup("user-b", { name: "Not yours" });
    await assert.rejects(() => f.repo.createFilter("user-a", { name: "X", groupId: group.id, criteria: {} }), /GROUP_NOT_FOUND/);
  } finally {
    await f.close();
  }
});

test("filters: full CRUD lifecycle stays user-scoped", async () => {
  const f = await fixture();
  try {
    const created = await f.repo.createFilter("user-a", { name: "Cheap 83s", criteria: { minRating: 83, maxRating: 83, maxBuyNow: 2000 } });
    assert.deepEqual((await f.repo.listFilters("user-a"))[0].criteria, created.criteria);
    assert.equal((await f.repo.listFilters("user-b")).length, 0);
    assert.equal(await f.repo.updateFilter("user-b", created.id, { name: "Hijacked", criteria: {} }), false);
    assert.equal(await f.repo.updateFilter("user-a", created.id, { name: "Renamed", criteria: { minRating: 84 } }), true);
    assert.equal((await f.repo.listFilters("user-a"))[0].name, "Renamed");
    assert.equal(await f.repo.deleteFilter("user-b", created.id), false);
    assert.equal(await f.repo.deleteFilter("user-a", created.id), true);
  } finally {
    await f.close();
  }
});

test("deleting a filter group only detaches its filters, never deletes them (ON DELETE SET NULL)", async () => {
  const f = await fixture();
  try {
    const group = await f.repo.createFilterGroup("user-a", { name: "Group" });
    const created = await f.repo.createFilter("user-a", { name: "In group", groupId: group.id, criteria: {} });
    await f.repo.deleteFilterGroup("user-a", group.id);
    const remaining = (await f.repo.listFilters("user-a")).find((x) => x.id === created.id);
    assert.ok(remaining, "the filter must survive its group's deletion");
    assert.equal(remaining.groupId, null);
  } finally {
    await f.close();
  }
});

// --- presets -----------------------------------------------------------------

test("presets: create/list/delete are user-scoped", async () => {
  const f = await fixture();
  try {
    const config = { criteria: {}, settings: {} };
    const created = await f.repo.createPreset("user-a", "auto_bid", "Safe sniping", config);
    assert.deepEqual((await f.repo.listPresets("user-a"))[0].config, config);
    assert.equal((await f.repo.listPresets("user-b")).length, 0);
    assert.equal(await f.repo.deletePreset("user-b", created.id), false);
    assert.equal(await f.repo.deletePreset("user-a", created.id), true);
  } finally {
    await f.close();
  }
});

// --- sessions (M1: metadata only) --------------------------------------------

test("sessions: created in DRAFT, archive is user-scoped and one-directional", async () => {
  const f = await fixture();
  try {
    const created = await f.repo.createSession("user-a", "search", { kind: "search", criteria: {} });
    assert.equal(created.status, "DRAFT");
    assert.equal(await f.repo.archiveSession("user-b", created.id), false, "cross-user archive must fail");
    assert.equal(await f.repo.archiveSession("user-a", created.id), true);
    assert.equal((await f.repo.listSessions("user-a"))[0].status, "ARCHIVED");
    assert.equal(await f.repo.archiveSession("user-a", created.id), false, "archiving an already-archived session is a no-op, not an error");
  } finally {
    await f.close();
  }
});

test("session status column rejects any executing state at the DB level", async () => {
  const f = await fixture();
  try {
    await assert.rejects(() =>
      f.client.execute({ sql: "INSERT INTO trader_sessions(id,application_user_id,kind,status,config,created_at,updated_at) VALUES(?,?,?,?,?,?,?)", args: ["s1", "user-a", "search", "RUNNING", "{}", "now", "now"] }),
    );
  } finally {
    await f.close();
  }
});

test("sessions: delete is user-scoped", async () => {
  const f = await fixture();
  try {
    const created = await f.repo.createSession("user-a", "search", { kind: "search", criteria: {} });
    assert.equal(await f.repo.deleteSession("user-b", created.id), false);
    assert.equal(await f.repo.deleteSession("user-a", created.id), true);
  } finally {
    await f.close();
  }
});

// --- metrics -------------------------------------------------------------

test("metrics default to real zeros for a user with no row yet", async () => {
  const f = await fixture();
  try {
    const metrics = await f.repo.getMetrics("user-a");
    assert.deepEqual({ totalSearches: metrics.totalSearches, totalBids: metrics.totalBids, totalSuccessBids: metrics.totalSuccessBids }, { totalSearches: 0, totalBids: 0, totalSuccessBids: 0 });
  } finally {
    await f.close();
  }
});
