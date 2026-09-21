"use client";
import { useI18n } from "@/components/i18n-provider";

// Shown instead of running the expensive path for FC27 features gated by
// fc27HeavyFanoutDisabled() (see src/lib/fc27/maintenance.ts). The page
// that renders this performs zero data fetching when the switch is on - no
// fetch, no query, no client-side effect here either - so flipping the
// kill switch genuinely stops all traffic for that route, not just the
// visible UI.
export function Fc27MaintenanceNotice({ featureEn, featureIt }: { featureEn: string; featureIt: string }) {
  const { locale } = useI18n();
  const feature = locale === "it" ? featureIt : featureEn;
  return (
    <section className="mx-auto max-w-xl px-6 pb-24 pt-48 text-center">
      <h1 className="text-3xl font-bold">
        {locale === "it" ? `${feature} è temporaneamente non disponibile per manutenzione.` : `${feature} is temporarily unavailable for maintenance.`}
      </h1>
      <p className="mt-4 text-sm text-white/50">
        {locale === "it" ? "Il resto di FUT Forge funziona normalmente. Riprova più tardi." : "The rest of FUT Forge is working normally. Please check back later."}
      </p>
    </section>
  );
}
