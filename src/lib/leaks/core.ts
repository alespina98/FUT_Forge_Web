// @ts-expect-error Node's native TypeScript test runner requires the explicit extension.
import { LEAK_CATEGORIES, LEAK_CONFIDENCES, type LeakCategory, type LeakConfidence } from "./types.ts";

export type IncomingLeakReport = { sourceId: string; sourceName: string; originalSourceId?: string; sourceUrl?: string; imageUrl?: string; title: string; shortDescription?: string; content?: string; category: string; confidence?: string; subject?: string; eventKey?: string; playerId?: string; resourceId?: string; reportedAt?: string };
export type NormalizedLeakReport = Omit<IncomingLeakReport, "category" | "confidence" | "subject"> & { category: LeakCategory; confidence: LeakConfidence; normalizedSubject: string; deduplicationKey: string; reportedAt: string };

const normalizeToken = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:" ? url.href : null; }
  catch { return null; }
}
export function isLeakCategory(value: string | null | undefined): value is LeakCategory { return !!value && LEAK_CATEGORIES.includes(value as LeakCategory); }
export function isLeakConfidence(value: string | null | undefined): value is LeakConfidence { return !!value && LEAK_CONFIDENCES.includes(value as LeakConfidence); }

export function normalizeIncomingReport(input: IncomingLeakReport): NormalizedLeakReport {
  if (!input.sourceId.trim() || !input.sourceName.trim() || !input.title.trim()) throw new Error("Source and title are required");
  if (!isLeakCategory(input.category)) throw new Error("Invalid leak category");
  if (input.confidence && !isLeakConfidence(input.confidence)) throw new Error("Invalid leak confidence");
  if (input.sourceUrl && !safeHttpUrl(input.sourceUrl)) throw new Error("Invalid source URL");
  if (input.imageUrl && !safeHttpUrl(input.imageUrl)) throw new Error("Invalid image URL");
  const normalizedSubject = normalizeToken(input.subject || input.title);
  if (!normalizedSubject) throw new Error("A normalized subject is required");
  const identity = input.playerId?.trim() || input.resourceId?.trim() || normalizedSubject;
  const event = normalizeToken(input.eventKey || "none");
  return { ...input, title: input.title.trim(), shortDescription: input.shortDescription?.trim(), content: input.content?.trim(), category: input.category, confidence: (input.confidence || "RUMOR") as LeakConfidence, normalizedSubject, reportedAt: input.reportedAt || new Date().toISOString(), deduplicationKey: `${input.category.toLowerCase()}:${normalizeToken(identity)}:${event}` };
}

export function reportsMatch(a: NormalizedLeakReport, b: NormalizedLeakReport): boolean {
  if (a.category !== b.category) return false;
  if (a.playerId && b.playerId) return a.playerId === b.playerId && normalizeToken(a.eventKey || "") === normalizeToken(b.eventKey || "");
  if (a.resourceId && b.resourceId) return a.resourceId === b.resourceId && normalizeToken(a.eventKey || "") === normalizeToken(b.eventKey || "");
  return a.deduplicationKey === b.deduplicationKey;
}

export function isPublicLeak(row: { is_published?: boolean; published_at?: string | null }): boolean { return row.is_published === true && !!row.published_at && new Date(row.published_at).getTime() <= Date.now(); }
