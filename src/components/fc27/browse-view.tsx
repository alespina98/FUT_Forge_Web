"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";

const words = {
  en: {
    eyebrow: "FC 27 DATABASE",
    title: "Explore the EA FC 27 Database",
    intro: "Browse FC 27 players by nation, club, league or position, then explore rankings, advanced stats and hidden gems.",
    primary: [
      ["Nations", "Browse players by nationality.", "/fc27/nations"],
      ["Clubs", "Explore FC 27 squads and players by club.", "/fc27/clubs"],
      ["Leagues", "Discover the best players from each league.", "/fc27/leagues"],
    ],
    more: "More ways to explore",
    secondary: [["Players Database", "/fc27/players"], ["Browse by Position", "/fc27/positions"], ["Rankings", "/fc27/rankings"], ["Base Meta Rankings", "/fc27/meta-rankings"], ["Advanced Stat Finder", "/fc27/stat-finder"], ["Hidden Gems", "/fc27/hidden-gems"]],
  },
  it: {
    eyebrow: "DATABASE FC 27",
    title: "Esplora il Database EA FC 27",
    intro: "Esplora i giocatori di FC 27 per nazione, club, campionato o posizione, poi scopri classifiche, statistiche avanzate e gemme nascoste.",
    primary: [
      ["Nazioni", "Esplora i giocatori per nazionalità.", "/fc27/nations"],
      ["Club", "Scopri le rose e i giocatori di FC 27 per club.", "/fc27/clubs"],
      ["Campionati", "Scopri i migliori giocatori di ogni campionato.", "/fc27/leagues"],
    ],
    more: "Altri modi per esplorare",
    secondary: [["Database Giocatori", "/fc27/players"], ["Esplora per Posizione", "/fc27/positions"], ["Classifiche", "/fc27/rankings"], ["Classifica Meta Base", "/fc27/meta-rankings"], ["Ricerca Avanzata", "/fc27/stat-finder"], ["Gemme Nascoste", "/fc27/hidden-gems"]],
  },
} as const;

export function Fc27BrowseView() {
  const { locale } = useI18n(); const c = words[locale];
  return <main className="hero-grid relative min-h-screen overflow-hidden px-4 pb-24 pt-36 sm:px-6 sm:pt-40"><div className="hero-noise"/><div className="hero-orb hero-orb-primary"/><div className="relative mx-auto max-w-5xl">
    <p className="section-label">{c.eyebrow}</p><h1 className="mt-3 text-4xl font-bold sm:text-5xl">{c.title}</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-white/55 sm:text-base">{c.intro}</p>
    <section className="mt-10 grid gap-4 md:grid-cols-3" aria-label={c.title}>{c.primary.map(([title,description,href])=><Link key={href} href={href} className="rounded-2xl border border-white/10 bg-white/[.04] p-6 transition hover:border-lime/50 hover:bg-lime/[.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime"><h2 className="text-xl font-semibold text-white">{title}</h2><p className="mt-2 text-sm leading-6 text-white/50">{description}</p><span className="mt-5 inline-block text-sm font-semibold text-lime">{title} →</span></Link>)}</section>
    <nav className="mt-10 rounded-2xl border border-white/10 bg-black/20 p-6" aria-label={c.more}><h2 className="text-lg font-semibold">{c.more}</h2><div className="mt-4 flex flex-wrap gap-3">{c.secondary.map(([label,href])=><Link key={href} href={href} className="rounded-full border border-white/10 px-4 py-3 text-sm text-white/70 transition hover:border-lime/45 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime">{label}</Link>)}</div></nav>
  </div></main>;
}
