import { createHash } from "node:crypto";
import type { LeakCategory, LeakGame } from "../types";

export function normalizeLeakText(value: string): string { return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/https?:\/\/\S+/g, " ").replace(/[^a-z0-9]+/g, " ").trim(); }
export function createFingerprint(input: { text: string; category: LeakCategory; game: LeakGame; publishedAt: string }): string {
  const tokens = normalizeLeakText(input.text).split(" ").filter(token => token.length > 2).slice(0, 24).sort();
  const day = new Date(input.publishedAt).toISOString().slice(0, 10);
  return createHash("sha256").update(`${input.game}|${input.category}|${day}|${tokens.join(" ")}`).digest("hex");
}
export function createExplicitFingerprint(value: string): string { return createHash("sha256").update(`explicit|${normalizeLeakText(value)}`).digest("hex"); }
