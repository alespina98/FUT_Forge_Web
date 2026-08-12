import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
// @ts-expect-error Node's native TypeScript CLI requires the explicit extension.
import { safeHttpUrl, safeLeakImageUrl } from "../src/lib/leaks/core.ts";
// @ts-expect-error Node's native TypeScript CLI requires the explicit extension.
import { runIngestion } from "../src/lib/leaks/ingestion/pipeline.ts";
// @ts-expect-error Node's native TypeScript CLI requires the explicit extension.
import { SupabaseLeakSink } from "../src/lib/leaks/ingestion/supabase-sink.ts";
import type { LeakProvider, LeakSourceCode, ProviderItem } from "../src/lib/leaks/ingestion/model";
// @ts-expect-error Node's native TypeScript CLI requires the explicit extension.
import { LEAK_CATEGORIES, LEAK_GAMES, LEAK_STATUSES, type LeakCategory, type LeakGame, type LeakStatus } from "../src/lib/leaks/types.ts";

type ManualSource = "unverified_original" | "asy" | "fut_agent" | "fut_sheriff";
type ManualInput = { source: ManualSource; source_url?: string; source_post_id?: string; image_sha256?: string; title: string; description: string; image_url?: string; published_at?: string; game: LeakGame; category?: LeakCategory; status?: LeakStatus; deduplication_key?: string; metadata?: Record<string, unknown> };
const sourceConfig: Record<ManualSource, { name: string; type: "EDITORIAL" | "EXTERNAL_SOCIAL"; verified: boolean }> = {
  unverified_original: { name: "Unverified source", type: "EDITORIAL", verified: false }, asy: { name: "ASY", type: "EXTERNAL_SOCIAL", verified: true },
  fut_agent: { name: "FUT Agent", type: "EXTERNAL_SOCIAL", verified: true }, fut_sheriff: { name: "FUT Sheriff", type: "EXTERNAL_SOCIAL", verified: true },
};
const fail = (message: string): never => { throw new Error(message); };
const text = (value: unknown, field: string, required = true) => typeof value === "string" && value.trim() ? value.trim() : required ? fail(`${field} is required`) : undefined;
const oneOf = <T extends string>(value: unknown, values: readonly T[], field: string): T => typeof value === "string" && values.includes(value as T) ? value as T : fail(`${field} must be one of: ${values.join(", ")}`);

function validate(value: unknown): ManualInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("Each input must be a JSON object");
  const row = value as Record<string, unknown>; const source = oneOf(row.source, ["unverified_original", "asy", "fut_agent", "fut_sheriff"] as const, "source");
  const sourceUrl = text(row.source_url, "source_url", false); if (sourceUrl && !safeHttpUrl(sourceUrl)) fail("source_url must be HTTP(S)");
  const imageUrl = text(row.image_url, "image_url", false); if (imageUrl && !safeLeakImageUrl(imageUrl)) fail("image_url must be HTTPS or a controlled /leaks/ image path");
  const publishedAt = text(row.published_at, "published_at", false); if (publishedAt && Number.isNaN(Date.parse(publishedAt))) fail("published_at must be a valid timestamp");
  const imageSha256 = text(row.image_sha256, "image_sha256", false)?.toLowerCase(); if (imageSha256 && !/^[a-f0-9]{64}$/.test(imageSha256)) fail("image_sha256 must contain 64 hexadecimal characters");
  const sourcePostId = text(row.source_post_id, "source_post_id", false); if (!sourcePostId && !sourceUrl && !imageSha256) fail("source_post_id, source_url or image_sha256 is required for stable identity");
  const category = row.category == null ? undefined : oneOf(row.category, LEAK_CATEGORIES, "category");
  const status = row.status == null ? "LEAKED" : oneOf(row.status, LEAK_STATUSES, "status");
  const metadata = row.metadata == null ? undefined : !Array.isArray(row.metadata) && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : fail("metadata must be an object");
  return { source, source_url: sourceUrl, source_post_id: sourcePostId, image_sha256: imageSha256, title: text(row.title, "title")!, description: text(row.description, "description")!, image_url: imageUrl, published_at: publishedAt ? new Date(publishedAt).toISOString() : undefined, game: oneOf(row.game, LEAK_GAMES, "game"), category, status, deduplication_key: text(row.deduplication_key, "deduplication_key", false), metadata };
}

const validateOnly = process.argv.includes("--validate-only"); const path = process.argv.slice(2).find(value => !value.startsWith("--")) ?? fail("Usage: npm run leaks:ingest -- path/to/leak.json [--validate-only]");
const parsed: unknown = JSON.parse(await readFile(path, "utf8")); const inputs = (Array.isArray(parsed) ? parsed : [parsed]).map(validate);
const serviceKey = validateOnly ? null : process.env.SUPABASE_SERVICE_ROLE_KEY ?? fail("SUPABASE_SERVICE_ROLE_KEY is required");
const results = []; const preview: unknown[] = []; const editorialImportedAt = new Date().toISOString();
for (const input of inputs) {
  const config = sourceConfig[input.source]; const sourcePostId = input.source_post_id ?? (input.image_sha256 ? `image-sha256:${input.image_sha256}` : createHash("sha256").update(`${input.source}|${new URL(input.source_url!).href}`).digest("hex"));
  const originalPublishedAtKnown = !!input.published_at; const publishedAt = input.published_at ?? editorialImportedAt;
  const item: ProviderItem = { sourcePostId, sourceUrl: input.source_url, title: input.title, description: input.description, rawText: `${input.title} ${input.description}`, imageUrl: input.image_url, publishedAt, game: input.game, category: input.category, status: input.status, deduplicationKey: input.deduplication_key, metadata: { ...input.metadata, ingestion: "manual_editorial", source_verified: config.verified, original_published_at_known: originalPublishedAtKnown, original_published_at: input.published_at ?? null, editorial_imported_at: editorialImportedAt, image_sha256: input.image_sha256 ?? null } };
  const provider: LeakProvider = { code: input.source as LeakSourceCode, name: config.name, sourceType: config.type, platform: "manual_editorial", verified: config.verified, enabled: true, async fetch() { return [item]; } };
  const sink = validateOnly ? { async save(value: unknown) { preview.push(value); return "created" as const; } } : new SupabaseLeakSink(serviceKey!);
  results.push(...await runIngestion([provider], sink));
}
process.stdout.write(`${JSON.stringify({ ok: results.every(result => !result.error), validateOnly, results, ...(validateOnly ? { preview } : {}) }, null, 2)}\n`);
if (results.some(result => result.error)) process.exitCode = 1;
