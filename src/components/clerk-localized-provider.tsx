"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { enUS, itIT } from "@clerk/localizations";
import { useI18n } from "./i18n-provider";

export function ClerkLocalizedProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useI18n();
  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/register"
      localization={locale === "it" ? itIT : enUS}
    >
      {children}
    </ClerkProvider>
  );
}
