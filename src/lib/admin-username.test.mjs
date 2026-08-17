import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(new URL("../../supabase/migrations/0005_admin_username_management.sql", import.meta.url), "utf8");
const detail = readFileSync(new URL("../components/app/admin-user-detail.tsx", import.meta.url), "utf8");
const list = readFileSync(new URL("../components/app/admin-users-list.tsx", import.meta.url), "utf8");

test("admin reads only canonical profiles.username and displays missing as dash", () => {
  assert.match(migration, /nullif\(btrim\(p\.username\), ''\)/);
  assert.doesNotMatch(migration, /raw_user_meta_data/);
  assert.match(list, /row\.username \|\| "—"/);
});

test("username update is admin-only, ID-scoped and changes no identity/access columns", () => {
  assert.match(migration, /if not public\.is_admin\(v_caller\)/);
  assert.match(migration, /where id = p_target_id/);
  assert.match(migration, /set username = v_username, updated_at = now\(\)/);
  const update = migration.match(/update public\.profiles[\s\S]*?where id = p_target_id;/)?.[0] || "";
  for (const forbidden of ["email =", "role =", "tier =", "id = v_"]) assert.doesNotMatch(update, new RegExp(forbidden));
  assert.match(migration, /revoke all on function public\.admin_set_user_username/);
});

test("UI assigns or edits canonical username with existing normalization rules", () => {
  assert.match(detail, /usernameDraft\.trim\(\)/);
  assert.match(detail, /username\.length < 3 \|\| username\.length > 32/);
  assert.match(detail, /p_target_id: detail\.id/);
  assert.match(detail, /error\.code === "23505"/);
  assert.doesNotMatch(detail, /split\(["']@["']\)|user_metadata/);
});

test("reload fetches the saved value from the canonical admin detail RPC", () => {
  assert.match(detail, /admin_get_user_detail/);
  assert.match(detail, /setUsernameDraft\(nextDetail\.username \|\| ""\)/);
});
