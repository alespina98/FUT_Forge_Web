"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";

// Shared shell for the two placeholder FC27 sub-pages (News, Squad
// Builder) reached from the new EA FC 27 nav dropdown - reuses the same
// empty-state card visual language as the player detail route's
// not-found.tsx, so the FC27 section stays visually consistent even where
// there's no real content yet.
export function Fc27ComingSoon({ variant }: { variant: "news" | "squadBuilder" }) {
  const { t } = useI18n();
  const p = t.fc27ComingSoon;
  const { title, body } = variant === "news" ? p.news : p.squadBuilder;
  return (
    <div className="hero-grid relative px-4 pb-24 pt-40 sm:px-6 sm:pt-48">
      <div className="hero-noise" /><div className="hero-orb hero-orb-primary" />
      <div className="relative mx-auto max-w-xl text-center">
        <p className="section-label mx-auto">FC 27</p>
        <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[.025] px-7 py-20">
          <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
          <p className="mt-3 text-sm text-white/45">{body}</p>
          <Link href="/fc27/players" className="mt-6 inline-block rounded-xl bg-lime px-5 py-3 text-xs font-bold text-black">{p.backToPlayers}</Link>
        </div>
      </div>
    </div>
  );
}
