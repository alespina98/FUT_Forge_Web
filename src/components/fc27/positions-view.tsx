"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { positionSlug } from "@/lib/fc27/best-positions";
import type { PositionCount } from "@/lib/fc27/positions";

const words = {
  en: { eyebrow: "FC 27 POSITIONS", title: "EA FC 27 Players by Position", intro: "Explore every supported playing role in the EA FC 27 database, with exact player counts and direct links to the 50 highest-rated players at each position.", players: "players", open: "View best", directories: "Explore other player directories", nations: "Nations", clubs: "Clubs", leagues: "Leagues" },
  it: { eyebrow: "POSIZIONI FC 27", title: "Giocatori EA FC 27 per Posizione", intro: "Esplora ogni ruolo supportato nel database EA FC 27, con il numero esatto di giocatori e i collegamenti diretti ai 50 migliori per ogni posizione.", players: "giocatori", open: "Vedi i migliori", directories: "Esplora le altre directory", nations: "Nazioni", clubs: "Club", leagues: "Campionati" },
} as const;

export function Fc27PositionsView({ positions }: { positions: PositionCount[] }) {
  const { locale, t } = useI18n(); const c = words[locale];
  return <main className="hero-grid relative min-h-screen overflow-hidden px-4 pb-24 pt-36 sm:px-6 sm:pt-40"><div className="hero-noise"/><div className="hero-orb hero-orb-primary"/><div className="relative mx-auto max-w-5xl">
    <p className="section-label">{c.eyebrow}</p><h1 className="mt-3 text-4xl font-bold sm:text-5xl">{c.title}</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-white/55 sm:text-base">{c.intro}</p>
    <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={c.title}>{positions.map(({ position, count }) => <li key={position}><Link href={`/fc27/best/${positionSlug(position)}`} className="flex min-h-32 h-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[.04] p-5 transition hover:border-lime/50 hover:bg-lime/[.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime"><strong className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-lime/10 text-lg text-lime">{position}</strong><span><b className="block text-white">{t.fc27BestPage.positions[position]}</b><span className="mt-1 block text-sm text-white/50">{count.toLocaleString(locale === "it" ? "it-IT" : "en-US")} {c.players}</span><span className="mt-2 block text-sm font-semibold text-lime">{c.open} →</span></span></Link></li>)}</ul>
    <nav className="mt-10 rounded-2xl border border-white/10 bg-black/20 p-6" aria-label={c.directories}><h2 className="text-lg font-semibold">{c.directories}</h2><div className="mt-4 flex flex-wrap gap-4 text-sm"><Link href="/fc27/nations">{c.nations}</Link><Link href="/fc27/clubs">{c.clubs}</Link><Link href="/fc27/leagues">{c.leagues}</Link></div></nav>
  </div></main>;
}
