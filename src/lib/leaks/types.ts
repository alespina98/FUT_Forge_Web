export const LEAK_CATEGORIES = ["PLAYER", "SBC", "EVOLUTION", "PROMO", "OBJECTIVE", "PACK", "OTHER"] as const;
export const LEAK_CONFIDENCES = ["RUMOR", "LIKELY", "CONFIRMED"] as const;

export type LeakCategory = (typeof LEAK_CATEGORIES)[number];
export type LeakConfidence = (typeof LEAK_CONFIDENCES)[number];

export type PlayerMetadata = {
  playerId?: string;
  resourceId?: string;
  name?: string;
  rating?: number;
  position?: string;
  club?: string;
  nation?: string;
  rarity?: string;
  stats?: Record<string, number>;
};

export type LeakSource = {
  id: string;
  name: string;
  sourceType: string;
  handle: string | null;
  platform: string;
  url: string | null;
  reliability: number;
};

export type LeakReport = {
  id: string;
  source: LeakSource;
  sourceUrl: string | null;
  originalSourceId: string | null;
  reportedAt: string;
  excerpt: string | null;
};

export type LeakTranslation = {
  title?: string;
  short_description?: string;
  content?: string;
};

export type LeakTranslations = Record<string, LeakTranslation>;

export type Leak = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  content: string;
  contentLocale: string;
  translations: LeakTranslations;
  category: LeakCategory;
  confidence: LeakConfidence;
  imageUrl: string | null;
  normalizedSubject: string;
  eventKey: string | null;
  player: PlayerMetadata | null;
  createdAt: string;
  publishedAt: string;
  updatedAt: string;
  firstSeenAt: string;
  reports: LeakReport[];
};

export type LeakListQuery = {
  category?: LeakCategory;
  confidence?: LeakConfidence;
  search?: string;
  order?: "newest" | "oldest";
};
