"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { PlayerPortrait } from "./player-portrait";
import { Fc27RankingsControls } from "./rankings-controls";
import { playerUrlSlug } from "@/lib/fc27/player-slug";
import { rankingValue, type RankingPlayer, type RankingStat } from "@/lib/fc27/rankings-shared";
import type { FilterOptions } from "@/lib/fc27/players";

export function Fc27RankingsView({ players, stat, options }: { players: RankingPlayer[]; stat: RankingStat; options: FilterOptions }) {
  const { t } = useI18n(); const c=t.fc27RankingsPage;
  return <div className="fc27-rankings-page hero-grid relative px-4 pb-24 pt-36 sm:px-6 sm:pt-40"><div className="hero-noise"/><div className="hero-orb hero-orb-primary"/><div className="relative mx-auto max-w-6xl">
    <p className="section-label">{c.eyebrow}</p><h1 className="mt-3 text-4xl font-bold sm:text-5xl">{c.title}</h1><p className="mt-3 max-w-2xl text-sm text-white/55 sm:text-base">{c.subtitle}</p>
    <div className="mt-8"><Fc27RankingsControls t={c} options={options} stat={stat}/></div>
    <section className="mt-6" aria-labelledby="ranking-heading"><div className="fc27-ranking-heading"><div><h2 id="ranking-heading">{c.top50} · {c.stats[stat]}</h2><p>{c.gkNotice}</p></div><Link href="/fc27/players">{c.browsePlayers}</Link></div>
      {players.length===0?<div className="fc27-ranking-empty"><p>{c.noPlayers}</p><Link href="/fc27/rankings">{c.resetFilters}</Link></div>:<ol className="fc27-ranking-list">{players.map((player,index)=>{const href=`/fc27/players/${playerUrlSlug(player.ea_player_id,player.slug)}`;return <li key={player.ea_player_id} className={`fc27-ranking-row rank-${index+1}`}>
        <span className="fc27-ranking-number" aria-label={`${c.rank} ${index+1}`}>#{index+1}</span>
        <div className="fc27-ranking-portrait"><PlayerPortrait src={player.avatar_url} alt={player.display_name} overall={player.overall}/></div>
        <div className="fc27-ranking-player"><Link href={href}>{player.display_name}</Link><span>{player.club_name??"—"}<i aria-hidden>·</i>{player.nationality_name}{player.league_name?<><i aria-hidden>·</i>{player.league_name}</>:null}</span></div>
        <span className="fc27-ranking-position">{player.position_short_label}</span>
        <span className="fc27-ranking-ovr"><b>{player.overall}</b><small>OVR</small></span>
        <span className="fc27-ranking-metric"><b>{rankingValue(player,stat)??"—"}</b><small>{c.shortStats[stat]}</small></span>
        <div className="fc27-ranking-actions"><Link href={href}>{c.viewPlayer}</Link><Link href={`/fc27/compare?a=${player.ea_player_id}`} className="compare">{c.compare}</Link></div>
      </li>})}</ol>}
    </section>
    <section className="fc27-ranking-seo"><h2>{c.aboutTitle}</h2><p>{c.aboutBody}</p></section>
  </div></div>;
}
