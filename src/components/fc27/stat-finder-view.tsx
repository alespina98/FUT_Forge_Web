"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { PlayerPortrait } from "./player-portrait";
import { playerUrlSlug } from "@/lib/fc27/player-slug";
import type { FilterOptions } from "@/lib/fc27/players";
import type { StatFinderResult } from "@/lib/fc27/stat-finder-shared";
import { playerHrefWithReturn } from "@/lib/fc27/return-navigation";
import { useFc27ReturnPath } from "@/lib/fc27/use-fc27-return-path";
import { Fc27StatFinderControls } from "./stat-finder-controls";

function pageHref(params:Record<string,string>,page:number){const next=new URLSearchParams(params);if(page<=1)next.delete("page");else next.set("page",String(page));const q=next.toString();return q?`/fc27/stat-finder?${q}`:"/fc27/stat-finder";}
export function Fc27StatFinderView({result,options,initial}:{result:StatFinderResult;options:FilterOptions;initial:Record<string,string>}){
  const {t}=useI18n();const c=t.fc27StatFinderPage;const returnTo=useFc27ReturnPath();const outfieldLabels=["PAC","SHO","PAS","DRI","DEF","PHY"];const goalkeeperLabels=["DIV","HAN","KIC","REF","SPD","POS"];
  return <div className="fc27-stat-page hero-grid relative px-4 pb-24 pt-36 sm:px-6 sm:pt-40"><div className="hero-noise"/><div className="hero-orb hero-orb-primary"/><div className="relative mx-auto max-w-6xl">
    <p className="section-label">{c.eyebrow}</p><h1 className="mt-3 text-4xl font-bold sm:text-5xl">{c.title}</h1><p className="mt-3 max-w-3xl text-sm text-white/55 sm:text-base">{c.subtitle}</p>
    <div className="mt-8"><Fc27StatFinderControls c={c} options={options} initial={initial}/></div>
    <section className="mt-8" aria-labelledby="stat-results"><div className="fc27-stat-results-head"><div><h2 id="stat-results">{c.results}</h2><p aria-live="polite">{c.resultCount.replace("{count}",String(result.total))}</p></div><small>{result.elapsedMs} ms</small></div>
      {result.players.length===0?<div className="fc27-ranking-empty"><p>{c.noPlayers}</p><span>{c.relaxFilters}</span><Link href="/fc27/stat-finder">{c.resetFilters}</Link></div>:<ol className="fc27-stat-results">{result.players.map((player,index)=>{const href=playerHrefWithReturn(`/fc27/players/${playerUrlSlug(player.ea_player_id,player.slug)}`,returnTo);const stats=[player.pace,player.shooting,player.passing,player.dribbling,player.defending,player.physicality];const labels=player.position_short_label==="GK"?goalkeeperLabels:outfieldLabels;return <li className="fc27-stat-row" key={player.ea_player_id}>
        <span className="fc27-ranking-number">#{(result.page-1)*50+index+1}</span><div className="fc27-ranking-portrait"><PlayerPortrait src={player.avatar_url} alt={player.display_name} overall={player.overall}/></div>
        <div className="fc27-ranking-player"><Link href={href}>{player.display_name}</Link><span>{player.club_name??"—"}<i aria-hidden>·</i>{player.nationality_name}{player.league_name?<><i aria-hidden>·</i>{player.league_name}</>:null}</span></div><span className="fc27-ranking-position">{player.position_short_label}</span><span className="fc27-ranking-ovr"><b>{player.overall}</b><small>OVR</small></span>
        <div className="fc27-stat-six">{stats.map((value,i)=><span key={labels[i]}><b>{value??"—"}</b><small>{labels[i]}</small></span>)}</div><div className="fc27-ranking-actions"><Link href={href}>{c.viewPlayer}</Link><Link href={`/fc27/compare?a=${player.ea_player_id}`} className="compare">{c.compare}</Link></div>
      </li>})}</ol>}
      {result.pageCount>1&&<nav className="fc27-stat-pagination" aria-label={c.pagination}>{result.page>1&&<Link href={pageHref(initial,result.page-1)}>{c.previous}</Link>}<span>{c.pageOf.replace("{page}",String(result.page)).replace("{pages}",String(result.pageCount))}</span>{result.page<result.pageCount&&<Link href={pageHref(initial,result.page+1)}>{c.next}</Link>}</nav>}
    </section>
    <section className="fc27-ranking-seo"><h2>{c.aboutTitle}</h2><p>{c.aboutBody}</p><div className="fc27-best-links"><Link href="/fc27/players">{c.playersDatabase}</Link><Link href="/fc27/rankings">{c.rankings}</Link><Link href="/fc27/compare">{c.comparePlayers}</Link></div></section>
  </div></div>;
}
