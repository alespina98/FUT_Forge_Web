// @ts-expect-error Node's native TypeScript test runner requires the explicit extension.
import { classifyLeak, detectGame } from "./classifier.ts";
// @ts-expect-error Node's native TypeScript test runner requires the explicit extension.
import { createExplicitFingerprint, createFingerprint, normalizeLeakText } from "./deduplication.ts";
import type { LeakProvider, NormalizedProviderItem, ProviderItem } from "./model";

export interface LeakSink { save(item: NormalizedProviderItem): Promise<"created" | "attached" | "skipped"> }
export type ProviderResult = { provider: string; enabled: boolean; fetched: number; created: number; attached: number; skipped: number; error?: string };

export function normalizeProviderItem(provider: LeakProvider, item: ProviderItem): NormalizedProviderItem {
  const category = item.category ?? classifyLeak(item.rawText); const game = item.game ?? detectGame(item.rawText); const normalizedSubject = normalizeLeakText(item.title);
  const fingerprint = item.deduplicationKey ? createExplicitFingerprint(item.deduplicationKey) : createFingerprint({ text: item.rawText, category, game, publishedAt: item.publishedAt });
  return { ...item, source: provider.code, sourceName: provider.name, sourceType: provider.sourceType ?? "EXTERNAL_SOCIAL", sourcePlatform: provider.platform ?? "public_feed", sourceVerified: provider.verified ?? true, category, game, status: item.status ?? "LEAKED", normalizedSubject, fingerprint };
}

export async function runIngestion(providers: LeakProvider[], sink: LeakSink): Promise<ProviderResult[]> {
  return Promise.all(providers.map(async provider => {
    const result: ProviderResult = { provider: provider.code, enabled: provider.enabled, fetched: 0, created: 0, attached: 0, skipped: 0 };
    if (!provider.enabled) return result;
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const items = await provider.fetch(controller.signal); result.fetched = items.length;
      for (const item of items) result[await sink.save(normalizeProviderItem(provider, item))]++;
    } catch (error) { result.error = error instanceof Error ? error.message : "Unknown provider error"; }
    finally { clearTimeout(timeout); }
    return result;
  }));
}
