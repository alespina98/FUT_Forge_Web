// Integration test for the analytics ingestion endpoint's CORS policy. Route handlers in this
// Next.js app cannot be imported directly by plain Node (next/server has no resolvable
// package export outside Next's own build pipeline - confirmed by hand), so this spins up a
// real `next dev` server on a dedicated port and asserts on actual HTTP responses, the same way
// the CORS bug itself was originally found (curl/Node's fetch don't enforce CORS at all, so
// only a header-shape assertion - not a real browser - is checked here; the real-browser proof
// lives in the session's manual verification, not in this automated suite).
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";

const PORT = 3911;
const BASE = `http://localhost:${PORT}`;
let devServer;

async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE, { signal: AbortSignal.timeout(2000) });
      if (res.ok || res.status < 500) return true;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

before(async () => {
  devServer = spawn("npm", ["run", "dev"], {
    cwd: new URL("../../../../..", import.meta.url).pathname.replace(/^\/([A-Za-z]):/, "$1:"),
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  const ready = await waitForServer(60_000);
  if (!ready) throw new Error(`dev server on port ${PORT} did not become ready in time`);
});

function killServerTree() {
  if (!devServer?.pid) return;
  // spawn("npm", ..., { shell: true }) on Windows means devServer.kill() only kills the shell
  // wrapper, not the actual next-server child holding file handles on .open-next (confirmed:
  // it left a listener on PORT and a locked .open-next/assets directory behind). taskkill /t
  // kills the whole process tree; plain .kill() is enough on POSIX.
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(devServer.pid), "/t", "/f"], { stdio: "ignore" });
  } else {
    devServer.kill();
  }
}

after(async () => {
  killServerTree();
  // The success-path test below inserts one real row into local D1 (there is no way to probe
  // the success response shape without a request D1 actually accepts) - remove it so repeated
  // runs of this suite don't accumulate rows in the local database.
  await new Promise((resolve) => {
    const cleanup = spawn("npx", [
      "wrangler", "d1", "execute", "ANALYTICS_DB", "--local",
      "--command", "DELETE FROM analytics_events WHERE install_id='cors-contract-test-install';",
    ], {
      cwd: new URL("../../../../..", import.meta.url).pathname.replace(/^\/([A-Za-z]):/, "$1:"),
      stdio: "ignore",
      shell: process.platform === "win32",
    });
    cleanup.on("exit", resolve);
    cleanup.on("error", resolve);
  });
});

test("allowed preflight: OPTIONS on the analytics endpoint returns a scoped, credential-free CORS grant", async () => {
  const res = await fetch(`${BASE}/api/analytics/events`, {
    method: "OPTIONS",
    headers: { Origin: "https://www.ea.com", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" },
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
  assert.equal(res.headers.get("access-control-allow-methods"), "POST, OPTIONS");
  assert.equal(res.headers.get("access-control-allow-headers"), "Content-Type, Authorization");
  assert.equal(res.headers.get("access-control-allow-credentials"), null, "must never pair a wildcard origin with Allow-Credentials");
});

test("actual POST response also carries the same CORS grant (not just the preflight)", async () => {
  const res = await fetch(`${BASE}/api/analytics/events`, {
    method: "POST",
    headers: { Origin: "https://www.ea.com", "Content-Type": "application/json" },
    body: JSON.stringify({ events: [] }), // intentionally invalid (empty) - only headers matter here
  });
  assert.equal(res.headers.get("access-control-allow-origin"), "*");
  assert.equal(res.headers.get("access-control-allow-credentials"), null);
});

test("disallowed method: GET is not implemented, so a cross-origin GET can never be enabled", async () => {
  const res = await fetch(`${BASE}/api/analytics/events`, { method: "GET", headers: { Origin: "https://www.ea.com" } });
  assert.equal(res.status, 405);
});

for (const method of ["PUT", "PATCH", "DELETE"]) {
  test(`disallowed method: ${method} is not implemented either`, async () => {
    const res = await fetch(`${BASE}/api/analytics/events`, { method, headers: { Origin: "https://www.ea.com" } });
    assert.equal(res.status, 405);
  });
}

test("the CORS grant never expands beyond Content-Type/Authorization, regardless of what a preflight requests", async () => {
  const res = await fetch(`${BASE}/api/analytics/events`, {
    method: "OPTIONS",
    headers: { Origin: "https://www.ea.com", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "x-custom-header, cookie" },
  });
  const allowedHeaders = res.headers.get("access-control-allow-headers");
  assert.equal(allowedHeaders, "Content-Type, Authorization", "must not reflect an arbitrarily requested header back");
  assert.doesNotMatch(allowedHeaders ?? "", /x-custom-header|cookie/i);
});

test("admin analytics summary route has no CORS grant at all (stays same-origin-only)", async () => {
  const res = await fetch(`${BASE}/api/admin/analytics/summary`, {
    method: "OPTIONS",
    headers: { Origin: "https://www.ea.com", "Access-Control-Request-Method": "GET" },
  });
  assert.equal(res.headers.get("access-control-allow-origin"), null, "the admin route must never grant cross-origin access");
});

test("admin analytics summary route's actual GET response also has no CORS grant", async () => {
  const res = await fetch(`${BASE}/api/admin/analytics/summary`, { method: "GET", headers: { Origin: "https://www.ea.com" } });
  assert.equal(res.headers.get("access-control-allow-origin"), null);
  // Same admin gate as before this change - unauthenticated cross-origin callers still get
  // refused by auth, not by CORS, but CORS refusal happens first in a real browser regardless.
  assert.ok([401, 403, 503].includes(res.status), `expected an admin-access-denied status, got ${res.status}`);
});

test("the analytics endpoint still only returns a minimal acceptance outcome, never event data", async () => {
  const res = await fetch(`${BASE}/api/analytics/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events: [{ event: "page_view", client_type: "web", install_id: "cors-contract-test-install" }] }),
  });
  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ["accepted", "ok"]);
  assert.equal(typeof body.accepted, "number");
});
