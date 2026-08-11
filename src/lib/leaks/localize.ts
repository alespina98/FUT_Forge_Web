import type { LeakTranslation, LeakTranslations } from "./types";

type CanonicalLeakContent = {
  title: string;
  shortDescription: string;
  content: string;
  translations: LeakTranslations;
};

function translatedValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function localizeLeakContent(leak: CanonicalLeakContent, locale: string): {
  title: string;
  shortDescription: string;
  content: string;
} {
  const translation: LeakTranslation | undefined = leak.translations[locale];
  return {
    title: translatedValue(translation?.title, leak.title),
    shortDescription: translatedValue(translation?.short_description, leak.shortDescription),
    content: translatedValue(translation?.content, leak.content),
  };
}
