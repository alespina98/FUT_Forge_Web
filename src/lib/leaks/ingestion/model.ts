import type { LeakCategory, LeakGame, LeakStatus } from "../types";

export type LeakSourceCode = "fut_sheriff" | "asy" | "fut_agent" | "unverified_original" | "fut_forge_discovery";
export type ProviderItem = { sourcePostId: string; sourceUrl?: string; title: string; description?: string; imageUrl?: string; publishedAt: string; rawText: string; category?: LeakCategory; game?: LeakGame; status?: LeakStatus; deduplicationKey?: string; metadata?: Record<string, unknown> };
export type NormalizedProviderItem = ProviderItem & { source: LeakSourceCode; sourceName: string; sourceType: "EDITORIAL" | "EXTERNAL_SOCIAL" | "FUT_FORGE_DISCOVERY"; sourcePlatform: string; sourceVerified: boolean; category: LeakCategory; game: LeakGame; status: LeakStatus; normalizedSubject: string; fingerprint: string };
export interface LeakProvider { readonly code: LeakSourceCode; readonly name: string; readonly enabled: boolean; readonly sourceType?: NormalizedProviderItem["sourceType"]; readonly platform?: string; readonly verified?: boolean; fetch(signal: AbortSignal): Promise<ProviderItem[]> }
