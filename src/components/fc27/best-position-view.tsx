"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { FC27_POSITIONS, positionSlug, type Fc27Position } from "@/lib/fc27/best-positions";
import type { RankingPlayer } from "@/lib/fc27/rankings-shared";
import { Fc27RankingList } from "./ranking-list";

export function Fc27BestPositionView({ players, position }: { players: RankingPlayer[]; position: Fc27Position }) {
  const { t, locale } = useI18n(); const c = t.fc27BestPage; const name = c.positions[position];
  return <div className="fc27-rankings-page fc27-best-page hero-grid relative px-4 pb-24 pt-36 sm:px-6 sm:pt-40"><div className="hero-noise"/><div className="hero-orb hero-orb-primary"/><div className="relative mx-auto max-w-6xl">
    <p className="section-label">{c.eyebrow}</p><h1 className="mt-3 text-4xl font-bold sm:text-5xl">{c.title.replace("{position}",name)}</h1><p className="mt-3 max-w-2xl text-sm text-white/55 sm:text-base">{c.subtitle.replace("{code}",position)}</p>
    <nav className="fc27-best-position-tabs mt-8" aria-label={c.positionNavigation}>{FC27_POSITIONS.map(code=><Link key={code} href={`/fc27/best/${positionSlug(code)}`} aria-current={code===position?"page":undefined} className={code===position?"active":""}>{code}</Link>)}</nav>
    <section className="mt-6" aria-labelledby="best-position-heading"><div className="fc27-ranking-heading"><div><h2 id="best-position-heading">{c.top50} {name}</h2><p>{c.orderedByOverall}</p></div><Link href="/fc27/rankings">{c.allRankings}</Link></div>
      <Fc27RankingList players={players} stat="overall" labels={{rank:c.rank,viewPlayer:c.viewPlayer,compare:c.compare,metric:"OVR"}} returnTo={`/fc27/best/${positionSlug(position)}`}/>
    </section>
    <section className="fc27-ranking-seo"><h2>{c.aboutTitle.replace("{position}",name)}</h2><p>{c.aboutBody.replace("{position}",name.toLowerCase())}</p><div className="fc27-best-links"><Link href="/fc27/players">{c.browsePlayers}</Link><Link href="/fc27/rankings">{c.allRankings}</Link><Link href="/fc27/stat-finder">Stat Finder</Link><Link href="/fc27/nations">{locale==="it"?"Giocatori per Nazione":"Players by Nation"}</Link><Link href="/fc27/clubs">{locale==="it"?"Giocatori per Club":"Players by Club"}</Link><Link href="/fc27/leagues">{locale==="it"?"Giocatori per Campionato":"Players by League"}</Link></div></section>
  </div></div>;
}
