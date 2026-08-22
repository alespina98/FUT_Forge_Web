"use client";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";

export default function NotFound() {
  const { t } = useI18n();
  const p = t.fc27PlayerDetailPage;
  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-40 text-center sm:pt-48">
      <div className="rounded-[28px] border border-white/10 bg-white/[.025] px-7 py-20">
        <h1 className="text-2xl font-semibold">{p.notFoundTitle}</h1>
        <p className="mt-3 text-sm text-white/45">{p.notFoundBody}</p>
        <Link href="/fc27/players" className="mt-6 inline-block rounded-xl bg-lime px-5 py-3 text-xs font-bold text-black">{p.backToPlayers}</Link>
      </div>
    </div>
  );
}
