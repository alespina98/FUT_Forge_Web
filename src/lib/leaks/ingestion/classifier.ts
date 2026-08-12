import type { LeakCategory, LeakGame } from "../types";

const rules: Array<[LeakCategory, RegExp]> = [
  ["EVOLUTION", /\b(evo|evolution|evoluzione)\b/i], ["SBC", /\b(sbc|squad building challenge)\b/i],
  ["PACK", /\b(pack|packs|pacchetto|player pick)\b/i], ["OBJECTIVE", /\b(objective|objectives|obiettivo)\b/i],
  ["PROMO", /\b(promo|team of|toty|tots|futties|event)\b/i], ["PLAYER", /\b(player|card|carta|ovr|rating)\b/i],
];
export function classifyLeak(text: string): LeakCategory { return rules.find(([, pattern]) => pattern.test(text))?.[0] ?? "OTHER"; }
export function detectGame(text: string): LeakGame { return /\b(?:fc\s?27|eafc\s?27)\b/i.test(text) ? "FC27" : "FC26"; }
