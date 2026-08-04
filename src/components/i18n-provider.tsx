"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { copy, locales, type Dictionary, type Locale } from "@/lib/copy";

const STORAGE_KEY = "fut-forge-locale";

type I18nValue = {
  locale: Locale;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return locales.includes(value as Locale);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>("en");
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const frame = window.requestAnimationFrame(() => {
      if (isLocale(saved)) updateLocale(saved);
      setStorageReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale, storageReady]);

  const value = useMemo<I18nValue>(() => ({
    locale,
    t: copy[locale],
    setLocale: updateLocale,
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
