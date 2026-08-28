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

export function normalizeRange(range: string | null): "24h" | "7d" | "30d" {
  return range === "7d" || range === "30d" ? range : "24h";
}

export function normalizeAuthFilter(auth: string | null): "all" | "authenticated" | "anonymous" {
  return auth === "authenticated" || auth === "anonymous" ? auth : "all";
}

export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function num(row: unknown): number {
  return Number((row as { n?: number } | undefined)?.n ?? 0);
}
