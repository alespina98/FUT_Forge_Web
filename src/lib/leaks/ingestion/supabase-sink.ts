import { createClient } from "@supabase/supabase-js";
// @ts-expect-error Node's native TypeScript CLI requires the explicit extension.
import { SUPABASE_URL } from "../../supabase/env.ts";
import type { NormalizedProviderItem } from "./model";
import type { LeakSink } from "./pipeline";

const slugify = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
export class SupabaseLeakSink implements LeakSink {
  private client;
  constructor(serviceRoleKey: string) { this.client = createClient(SUPABASE_URL, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }); }
  async save(item: NormalizedProviderItem): Promise<"created" | "attached" | "skipped"> {
    const { data: source, error: sourceError } = await this.client.from("leak_sources").upsert({ name: item.sourceName, source_type: item.sourceType, handle: item.source, platform: item.sourcePlatform, enabled: true, reliability: 0.5, metadata: { verified: item.sourceVerified } }, { onConflict: "platform,handle" }).select("id").single();
    if (sourceError) throw sourceError;
    const { data: exact } = await this.client.from("leak_reports").select("id,source_url,reported_at,excerpt,source_payload").eq("source_id", source.id).eq("original_source_id", item.sourcePostId).maybeSingle();
    if (exact) {
      const next = { source_url: item.sourceUrl || null, reported_at: item.publishedAt, excerpt: item.description || null, source_payload: item.metadata || {} };
      const comparablePayload = (value: Record<string, unknown>) => Object.fromEntries(Object.entries(value).filter(([key]) => key !== "editorial_imported_at"));
      const unknownOriginalTime = next.source_payload.original_published_at_known === false && (exact.source_payload as Record<string, unknown>).original_published_at_known === false;
      const sameTimestamp = unknownOriginalTime || exact.reported_at === next.reported_at;
      if (exact.source_url === next.source_url && sameTimestamp && exact.excerpt === next.excerpt && JSON.stringify(comparablePayload(exact.source_payload as Record<string, unknown>)) === JSON.stringify(comparablePayload(next.source_payload))) return "skipped";
      const { error } = await this.client.from("leak_reports").update(next).eq("id", exact.id); if (error) throw error; return "attached";
    }
    let matchQuery = this.client.from("leaks").select("id").eq("fingerprint", item.fingerprint);
    if (!item.deduplicationKey) matchQuery = matchQuery.gte("published_at", new Date(Date.parse(item.publishedAt) - 36 * 60 * 60 * 1000).toISOString()).lte("published_at", new Date(Date.parse(item.publishedAt) + 36 * 60 * 60 * 1000).toISOString());
    const { data: existing } = await matchQuery.maybeSingle();
    let leakId = existing?.id; let outcome: "created" | "attached" = "attached";
    if (!leakId) {
      const suffix = item.fingerprint.slice(0, 8); const { data: leak, error } = await this.client.from("leaks").insert({ slug: `${slugify(item.title) || "leak"}-${suffix}`, title: item.title, short_description: item.description || item.title, content: item.description || item.rawText, category: item.category, confidence: "RUMOR", game: item.game, status: item.status, normalized_subject: item.normalizedSubject, deduplication_key: item.fingerprint, fingerprint: item.fingerprint, image_url: item.imageUrl || null, metadata: item.metadata || {}, is_published: true, first_seen_at: item.publishedAt, published_at: item.publishedAt }).select("id").single();
      if (error) throw error; leakId = leak.id; outcome = "created";
    }
    const { error: reportError } = await this.client.from("leak_reports").insert({ leak_id: leakId, source_id: source.id, original_source_id: item.sourcePostId, source_url: item.sourceUrl || null, source_payload: item.metadata || {}, normalized_subject: item.normalizedSubject, excerpt: item.description || null, reported_at: item.publishedAt });
    if (reportError) throw reportError; return outcome;
  }
}
