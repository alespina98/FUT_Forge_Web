import "server-only";
import type { Leak, LeakListQuery, LeakReport, LeakSource, LeakTranslation, LeakTranslations, PlayerMetadata } from "./types";
import { safeHttpUrl } from "./core";
import { buildLeakPrefixQuery } from "./search";
import { readPublishedLeaks } from "./supabase-read";

type DbRow = Record<string, unknown>;
const sourceSelect = "id,name,source_type,handle,platform,url,reliability";
const reportSelect = `id,source_url,original_source_id,reported_at,excerpt,source:leak_sources(${sourceSelect})`;
const leakSelect = `id,slug,title,short_description,content,content_locale,translations,category,confidence,image_url,normalized_subject,event_key,player_metadata,created_at,published_at,updated_at,first_seen_at,reports:leak_reports(${reportSelect})`;

function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function mapTranslations(value: unknown): LeakTranslations {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([locale, translation]) => {
    if (!isRecord(translation)) return [];
    const mapped: LeakTranslation = {};
    if (typeof translation.title === "string") mapped.title = translation.title;
    if (typeof translation.short_description === "string") mapped.short_description = translation.short_description;
    if (typeof translation.content === "string") mapped.content = translation.content;
    return [[locale, mapped]];
  }));
}
function mapSource(row: DbRow): LeakSource { return { id: String(row.id), name: String(row.name), sourceType: String(row.source_type), handle: row.handle ? String(row.handle) : null, platform: String(row.platform), url: safeHttpUrl(row.url), reliability: Number(row.reliability) }; }
function mapReport(row: DbRow): LeakReport { const rawSource = Array.isArray(row.source) ? row.source[0] : row.source; return { id: String(row.id), source: mapSource(isRecord(rawSource) ? rawSource : {}), sourceUrl: safeHttpUrl(row.source_url), originalSourceId: row.original_source_id ? String(row.original_source_id) : null, reportedAt: String(row.reported_at), excerpt: row.excerpt ? String(row.excerpt) : null }; }
function mapLeak(row: DbRow): Leak { return { id: String(row.id), slug: String(row.slug), title: String(row.title), shortDescription: String(row.short_description), content: String(row.content), contentLocale: String(row.content_locale), translations: mapTranslations(row.translations), category: row.category as Leak["category"], confidence: row.confidence as Leak["confidence"], imageUrl: safeHttpUrl(row.image_url), normalizedSubject: String(row.normalized_subject), eventKey: row.event_key ? String(row.event_key) : null, player: isRecord(row.player_metadata) ? row.player_metadata as PlayerMetadata : null, createdAt: String(row.created_at), publishedAt: String(row.published_at), updatedAt: String(row.updated_at), firstSeenAt: String(row.first_seen_at), reports: (Array.isArray(row.reports) ? row.reports.filter(isRecord) : []).map(mapReport) }; }

export async function listPublishedLeaks(filters: LeakListQuery = {}): Promise<Leak[]> {
  const prefixQuery = filters.search ? buildLeakPrefixQuery(filters.search) : null;
  if (filters.search && !prefixQuery) return [];
  const params = new URLSearchParams({
    select: leakSelect,
    is_published: "eq.true",
    published_at: `lte.${new Date().toISOString()}`,
    order: `published_at.${filters.order === "oldest" ? "asc" : "desc"}`,
  });
  if (filters.category) params.set("category", `eq.${filters.category}`);
  if (filters.confidence) params.set("confidence", `eq.${filters.confidence}`);
  if (prefixQuery) params.set("search_document", `fts(simple).${prefixQuery}`);
  const data = await readPublishedLeaks(params);
  return (data as DbRow[]).map(mapLeak);
}

export async function getPublishedLeak(slug: string): Promise<Leak | null> {
  const params = new URLSearchParams({
    select: leakSelect,
    slug: `eq.${slug}`,
    is_published: "eq.true",
    published_at: `lte.${new Date().toISOString()}`,
    limit: "1",
  });
  const data = await readPublishedLeaks(params);
  return data[0] ? mapLeak(data[0] as DbRow) : null;
}
