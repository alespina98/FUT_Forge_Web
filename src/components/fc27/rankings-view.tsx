"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { Fc27RankingsControls } from "./rankings-controls";
import { Fc27RankingList } from "./ranking-list";
import type { RankingPlayer, RankingStat } from "@/lib/fc27/rankings-shared";
import type { FilterOptions } from "@/lib/fc27/players";
import { useFc27ReturnPath } from "@/lib/fc27/use-fc27-return-path";

export function Fc27RankingsView({ players, stat, options }: { players: RankingPlayer[]; stat: RankingStat; options: FilterOptions }) {
  const { t, locale } = useI18n(); const c=t.fc27RankingsPage; const returnTo=useFc27ReturnPath();
  return <div className="fc27-rankings-page hero-grid relative px-4 pb-24 pt-36 sm:px-6 sm:pt-40"><div className="hero-noise"/><div className="hero-orb hero-orb-primary"/><div className="relative mx-auto max-w-6xl">
    <p className="section-label">{c.eyebrow}</p><h1 className="mt-3 text-4xl font-bold sm:text-5xl">{c.title}</h1><p className="mt-3 max-w-2xl text-sm text-white/55 sm:text-base">{c.subtitle}</p>
    <div className="mt-8"><Fc27RankingsControls t={c} options={options} stat={stat}/></div>
    <section className="mt-6" aria-labelledby="ranking-heading"><div className="fc27-ranking-heading"><div><h2 id="ranking-heading">{c.top50} · {c.stats[stat]}</h2><p>{c.gkNotice}</p></div><Link href="/fc27/players">{c.browsePlayers}</Link></div>
      {players.length===0?<div className="fc27-ranking-empty"><p>{c.noPlayers}</p><Link href="/fc27/rankings">{c.resetFilters}</Link></div>:<Fc27RankingList players={players} stat={stat} labels={{rank:c.rank,viewPlayer:c.viewPlayer,compare:c.compare,metric:c.shortStats[stat]}} returnTo={returnTo}/>}
    </section>
    <section className="fc27-ranking-seo"><h2>{c.aboutTitle}</h2><p>{c.aboutBody}</p><div className="fc27-best-links"><Link href="/fc27/best/st">{c.browseByPosition}</Link><Link href="/fc27/stat-finder">{c.advancedStatFinder}</Link><Link href="/fc27/nations">{locale==="it"?"Giocatori per Nazione":"Players by Nation"}</Link><Link href="/fc27/clubs">{locale==="it"?"Giocatori per Club":"Players by Club"}</Link><Link href="/fc27/leagues">{locale==="it"?"Giocatori per Campionato":"Players by League"}</Link></div></section>
  </div></div>;
}
