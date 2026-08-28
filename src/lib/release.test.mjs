import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Regression test for a real production incident: the Android download button
// served a stale APK (1.0.9) even though public/android/version.json - the
// same manifest the in-app updater trusts - already pointed at 1.0.19. The
// cause was androidRelease() re-deriving "latest" from the GitHub releases
// API's list order, which is NOT reliable here because every release in this
// repo shares the same created_at (bulk-created as drafts) - so "first
// FUT-Forge-Android-*.apk match in API order" silently picked an old release.
// This test locks the website's Android link to public/android/version.json
// so the two can never diverge again without failing CI.

test("androidRelease() returns exactly what public/android/version.json publishes", async () => {
  const { androidRelease } = await import("./release.ts");
  const manifestPath = path.join(process.cwd(), "public", "android", "version.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  const release = await androidRelease();

  assert.equal(release.version, manifest.latestVersion, "site version must match version.json's latestVersion");
  assert.equal(release.downloadUrl, manifest.apkUrl, "site download URL must match version.json's apkUrl");
  assert.equal(release.sha256, manifest.sha256, "site checksum must match version.json's sha256");
  assert.equal(release.size, manifest.size, "site file size must match version.json's size");
  assert.match(release.downloadUrl, /\/android-v[\d.]+\/FUT-Forge-Android-[\d.]+\.apk$/, "download URL must point at the release tagged for that same version");
  assert.equal(
    release.filename,
    `FUT-Forge-Android-${manifest.latestVersion}.apk`,
    "downloaded filename must carry the manifest's latest version, not an older one",
  );
});

test("androidRelease() never derives the download link from GitHub releases list order", async () => {
  // Source-level guard: this is what actually broke - a for-loop over the
  // GitHub API's release list, taking the first FUT-Forge-Android-*.apk match.
  // Assert that code shape is gone, not just that today's manifest happens to
  // be correct.
  const source = await readFile(path.join(process.cwd(), "src", "lib", "release.ts"), "utf8");
  const androidFn = source.slice(source.indexOf("export async function androidRelease"), source.indexOf("async function loadReleaseCatalog"));
  assert.doesNotMatch(androidFn, /for \(const release of releases\)/, "androidRelease() must not scan the GitHub releases list");
  assert.match(androidFn, /android\/version\.json/, "androidRelease() must read the manifest that the updater itself trusts");
});
