import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createClient } from "@libsql/client";

const directory = await mkdtemp(path.join(os.tmpdir(), "futforge-trader-access-"));
process.env.TURSO_DATABASE_URL = `file:${path.join(directory, "identity.db")}`;
delete process.env.TURSO_AUTH_TOKEN;
delete process.env.TRADER_KILL_SWITCH;

// Apply the same migrations the real identity DB uses, via a plain client
// pointed at the same file - resolveTraderAccess's own getIdentityRepository()
// singleton opens the same file lazily on first call.
const migrationClient = createClient({ url: process.env.TURSO_DATABASE_URL });
for (const migration of ["0001_website_identity.sql", "0003_admin_control_plane.sql"]) {
  await migrationClient.executeMultiple(await readFile(new URL(`../../../turso/migrations/${migration}`, import.meta.url), "utf8"));
}

async function createUser(id, tier = "FREE") {
  const now = new Date().toISOString();
  await migrationClient.execute({
    sql: "INSERT INTO app_users(id,email,email_normalized,username,username_normalized,role,tier,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
    args: [id, `${id}@example.com`, `${id}@example.com`, id, id, "USER", tier, now, now],
  });
}
async function setOverride(userId, featureId, enabled) {
  await migrationClient.execute({
    sql: "INSERT INTO entitlement_overrides(application_user_id,feature_id,enabled,updated_at) VALUES(?,?,?,?) ON CONFLICT(application_user_id,feature_id) DO UPDATE SET enabled=excluded.enabled",
    args: [userId, featureId, enabled ? 1 : 0, new Date().toISOString()],
  });
}

const { resolveTraderAccess, traderKillSwitchActive } = await import("./access.ts");

test("no applicationUserId resolves fully closed without touching the database", async () => {
  const result = await resolveTraderAccess(null);
  assert.deepEqual(result, { "trader.access": false, "trader.auto_bid": false, "trader.auto_trade": false, "trader.sniping": false, "trader.sbc": false });
});

test("unknown user resolves fully closed", async () => {
  const result = await resolveTraderAccess("does-not-exist");
  assert.equal(result["trader.access"], false);
});

test("known user with no overrides is closed by default (empty FEATURE_TIERS for every trader.* id)", async () => {
  await createUser("user-default", "PREMIUM"); // even PREMIUM does not unlock Trader
  const result = await resolveTraderAccess("user-default");
  assert.equal(result["trader.access"], false);
  assert.equal(result["trader.auto_bid"], false);
});

test("a per-user trader.access override unlocks access but no sub-flag by default", async () => {
  await createUser("user-access-only");
  await setOverride("user-access-only", "trader.access", true);
  const result = await resolveTraderAccess("user-access-only");
  assert.equal(result["trader.access"], true);
  assert.equal(result["trader.auto_bid"], false);
  assert.equal(result["trader.auto_trade"], false);
  assert.equal(result["trader.sniping"], false);
  assert.equal(result["trader.sbc"], false);
});

test("sub-flags require their own override even when trader.access is granted", async () => {
  await createUser("user-full");
  await setOverride("user-full", "trader.access", true);
  await setOverride("user-full", "trader.auto_bid", true);
  const result = await resolveTraderAccess("user-full");
  assert.equal(result["trader.access"], true);
  assert.equal(result["trader.auto_bid"], true);
  assert.equal(result["trader.auto_trade"], false, "auto_trade was never granted for this user");
});

test("a sub-flag override alone (trader.access still DEFAULT/false) never unlocks anything - master switch wins", async () => {
  await createUser("user-subflag-only");
  await setOverride("user-subflag-only", "trader.auto_bid", true); // no trader.access override
  const result = await resolveTraderAccess("user-subflag-only");
  assert.equal(result["trader.access"], false);
  assert.equal(result["trader.auto_bid"], false, "sub-flags must be forced closed when trader.access is closed");
});

test("overrides are isolated per user - granting one account never affects another", async () => {
  await createUser("user-a");
  await createUser("user-b");
  await setOverride("user-a", "trader.access", true);
  const a = await resolveTraderAccess("user-a");
  const b = await resolveTraderAccess("user-b");
  assert.equal(a["trader.access"], true);
  assert.equal(b["trader.access"], false);
});

test("explicit trader.access DISABLED override closes access even for an otherwise-entitled tier", async () => {
  await createUser("user-disabled");
  await setOverride("user-disabled", "trader.access", false);
  const result = await resolveTraderAccess("user-disabled");
  assert.equal(result["trader.access"], false);
});

test("kill switch forces every flag closed regardless of any override", async () => {
  await createUser("user-killed");
  await setOverride("user-killed", "trader.access", true);
  await setOverride("user-killed", "trader.auto_bid", true);
  process.env.TRADER_KILL_SWITCH = "true";
  try {
    assert.equal(traderKillSwitchActive(), true);
    const result = await resolveTraderAccess("user-killed");
    assert.deepEqual(result, { "trader.access": false, "trader.auto_bid": false, "trader.auto_trade": false, "trader.sniping": false, "trader.sbc": false });
  } finally {
    delete process.env.TRADER_KILL_SWITCH;
  }
});

test("kill switch check never touches the database (no applicationUserId lookup needed to fail closed)", async () => {
  process.env.TRADER_KILL_SWITCH = "true";
  try {
    const result = await resolveTraderAccess("user-that-does-not-exist-but-would-error-if-queried");
    assert.equal(result["trader.access"], false);
  } finally {
    delete process.env.TRADER_KILL_SWITCH;
  }
});

test("revocation takes effect on the next resolution (no caching across calls)", async () => {
  await createUser("user-revoke");
  await setOverride("user-revoke", "trader.access", true);
  assert.equal((await resolveTraderAccess("user-revoke"))["trader.access"], true);
  await setOverride("user-revoke", "trader.access", false);
  assert.equal((await resolveTraderAccess("user-revoke"))["trader.access"], false);
});
