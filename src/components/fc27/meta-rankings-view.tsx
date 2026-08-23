"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { PlayerPortrait } from "./player-portrait";
import { playerUrlSlug } from "@/lib/fc27/player-slug";
import type { MetaPositionFilter, MetaRankingPlayer } from "@/lib/fc27/meta-rankings";

const META_POSITION_FILTERS: MetaPositionFilter[] = ["ST", "LW", "RW", "CAM", "CM", "CDM", "LB", "RB", "CB", "GK"];

export function Fc27MetaRankingsView({ players, position }: { players: MetaRankingPlayer[]; position?: MetaPositionFilter }) {
  const { t } = useI18n();
  const c = t.fc27MetaRankingsPage;
  return <main className="fc27-rankings-page hero-grid relative px-4 pb-24 pt-36 sm:px-6 sm:pt-40"><div className="hero-noise"/><div className="hero-orb hero-orb-primary"/><div className="relative mx-auto max-w-6xl">
    <p className="section-label">{c.eyebrow}</p><h1 className="mt-3 text-4xl font-bold sm:text-5xl">{c.title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-white/55 sm:text-base">{c.intro}</p>
    <nav className="fc27-best-position-tabs mt-8" aria-label={c.positionFilter}><Link className={!position ? "active" : ""} href="/fc27/meta-rankings">{c.all}</Link>{META_POSITION_FILTERS.map(code=><Link key={code} className={position===code?"active":""} href={`/fc27/meta-rankings?position=${code}`}>{code}</Link>)}</nav>
    <section className="mt-6" aria-labelledby="meta-ranking-heading"><div className="fc27-ranking-heading"><div><h2 id="meta-ranking-heading">{c.top100}{position?` · ${position}`:""}</h2><p>{c.primaryPosition}</p></div><Link href="/fc27/rankings">{c.allRankings}</Link></div>
      <ol className="fc27-ranking-list">{players.map((player,index)=>{const href=`/fc27/players/${playerUrlSlug(player.ea_player_id,player.slug)}?returnTo=${encodeURIComponent(`/fc27/meta-rankings${position?`?position=${position}`:""}`)}`;return <li key={player.ea_player_id} className={`fc27-ranking-row fc27-meta-ranking-row rank-${index+1}`}>
        <span className="fc27-ranking-number" aria-label={`${c.rank} ${index+1}`}>#{index+1}</span><div className="fc27-ranking-portrait"><PlayerPortrait src={player.avatar_url} alt={player.display_name} overall={player.overall}/></div>
        <div className="fc27-ranking-player"><Link href={href}>{player.display_name}</Link><span>{player.club_name??"—"}<i aria-hidden>·</i>{player.nationality_name}</span></div><span className="fc27-ranking-position">{player.position_short_label}</span>
        <span className="fc27-ranking-ovr"><b>{player.overall}</b><small>OVR</small></span><span className="fc27-ranking-metric"><b>{player.base_meta_rating.toFixed(1)}</b><small>{c.shortLabel}</small></span>
        <div className="fc27-ranking-actions"><Link href={href}>{c.viewPlayer}</Link><Link href={`/fc27/compare?a=${player.ea_player_id}`} className="compare">{c.compare}</Link></div>
      </li>})}</ol>
    </section>
    <aside className="fc27-meta-explanation mt-8"><strong>{c.label}</strong><p>{c.explanation}</p></aside>
  </div></main>;
}
