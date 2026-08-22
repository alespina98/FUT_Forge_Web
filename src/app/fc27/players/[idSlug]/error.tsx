"use client";
import { useI18n } from "@/components/i18n-provider";

export default function ErrorState({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  const p = t.fc27PlayerDetailPage;
  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-40 text-center sm:pt-48">
      <div className="rounded-[28px] border border-white/10 bg-white/[.025] px-7 py-20">
        <h1 className="text-2xl font-semibold">{p.errorTitle}</h1>
        <p className="mt-3 text-sm text-white/45">{p.errorBody}</p>
        <button onClick={reset} className="mt-6 rounded-xl bg-lime px-5 py-3 text-xs font-bold text-black">{p.retry}</button>
      </div>
    </div>
  );
}
