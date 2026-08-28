// @ts-expect-error TS5097: direct Node test execution requires the extension.
import { CLIENT_TYPES } from "./events.ts";

export function platformClause(platform: string | null): { clause: string; params: string[] } {
  if (!platform || !CLIENT_TYPES.includes(platform as (typeof CLIENT_TYPES)[number])) return { clause: "", params: [] };
  return { clause: " AND client_type = ?", params: [platform] };
}

export function authClause(auth: string | null): string {
  if (auth === "authenticated") return " AND user_id IS NOT NULL";
  if (auth === "anonymous") return " AND user_id IS NULL";
  return "";
}

export type RangeKey = "today" | "7d" | "30d" | "custom";

export function normalizeRange(range: string | null): RangeKey {
  return range === "7d" || range === "30d" || range === "custom" ? range : "today";
}

export function normalizeAuthFilter(auth: string | null): "all" | "authenticated" | "anonymous" {
  return auth === "authenticated" || auth === "anonymous" ? auth : "all";
}

const DAY_MS = 24 * 60 * 60 * 1000;

export type Window = {
  since: number;
  until: number;
  prevSince: number;
  prevUntil: number;
  bucketGranularity: "hour" | "day";
  rangeLabel: string;
  comparisonLabel: string;
};

// Centralizes the "which time window are we looking at, and what's the
// comparison window" math so the route handler stays pure query-building.
// "today" is a real calendar day (UTC midnight to now) - not a rolling 24h
// window - matching the dashboard's fixed 00:00->24:00 chart axis.
export function resolveWindow(range: RangeKey, now: number, customFrom?: number | null, customTo?: number | null): Window {
  if (range === "today") {
    const since = new Date(new Date(now).toISOString().slice(0, 10) + "T00:00:00.000Z").getTime();
    return { since, until: now, prevSince: since - DAY_MS, prevUntil: since, bucketGranularity: "hour", rangeLabel: "oggi", comparisonLabel: "rispetto a ieri" };
  }
  if (range === "7d") {
    const since = now - 7 * DAY_MS;
    return { since, until: now, prevSince: since - 7 * DAY_MS, prevUntil: since, bucketGranularity: "day", rangeLabel: "ultimi 7 giorni", comparisonLabel: "rispetto ai 7 giorni precedenti" };
  }
  if (range === "30d") {
    const since = now - 30 * DAY_MS;
    return { since, until: now, prevSince: since - 30 * DAY_MS, prevUntil: since, bucketGranularity: "day", rangeLabel: "ultimi 30 giorni", comparisonLabel: "rispetto ai 30 giorni precedenti" };
  }
  // custom
  const until = Number.isFinite(customTo) && customTo ? Math.min(customTo, now) : now;
  const since = Number.isFinite(customFrom) && customFrom && customFrom < until ? customFrom : until - DAY_MS;
  const span = Math.max(until - since, 1);
  return {
    since, until, prevSince: since - span, prevUntil: since,
    bucketGranularity: span <= 2 * DAY_MS ? "hour" : "day",
    rangeLabel: "periodo personalizzato",
    comparisonLabel: "rispetto al periodo precedente",
  };
}

// Simple current-vs-previous delta as requested by the dashboard copy
// ("+2 rispetto a ieri") - an absolute difference, not a percentage.
export function delta(current: number, previous: number): number {
  return current - previous;
}

export function num(row: unknown): number {
  return Number((row as { n?: number } | undefined)?.n ?? 0);
}

// Safe percentage for the funnel (never NaN/Infinity on a zero base).
export function safePct(part: number, base: number): number | null {
  if (base <= 0) return null;
  return Math.round((part / base) * 100);
}
