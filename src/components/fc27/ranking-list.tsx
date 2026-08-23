"use client";

import Link from "next/link";
import { PlayerPortrait } from "./player-portrait";
import { playerUrlSlug } from "@/lib/fc27/player-slug";
import { rankingValue, type RankingPlayer, type RankingStat } from "@/lib/fc27/rankings-shared";
import { playerHrefWithReturn } from "@/lib/fc27/return-navigation";

type Labels = { rank: string; viewPlayer: string; compare: string; metric: string };

export function Fc27RankingList({ players, stat, labels, returnTo }: { players: RankingPlayer[]; stat: RankingStat; labels: Labels; returnTo: string }) {
  return <ol className="fc27-ranking-list">{players.map((player,index)=>{const href=playerHrefWithReturn(`/fc27/players/${playerUrlSlug(player.ea_player_id,player.slug)}`,returnTo);return <li key={player.ea_player_id} className={`fc27-ranking-row rank-${index+1}`}>
    <span className="fc27-ranking-number" aria-label={`${labels.rank} ${index+1}`}>#{index+1}</span>
    <div className="fc27-ranking-portrait"><PlayerPortrait src={player.avatar_url} alt={player.display_name} overall={player.overall}/></div>
    <div className="fc27-ranking-player"><Link href={href}>{player.display_name}</Link><span>{player.club_name??"—"}<i aria-hidden>·</i>{player.nationality_name}{player.league_name?<><i aria-hidden>·</i>{player.league_name}</>:null}</span></div>
    <span className="fc27-ranking-position">{player.position_short_label}</span>
    <span className="fc27-ranking-ovr"><b>{player.overall}</b><small>OVR</small></span>
    <span className="fc27-ranking-metric"><b>{rankingValue(player,stat)??"—"}</b><small>{labels.metric}</small></span>
    <div className="fc27-ranking-actions"><Link href={href}>{labels.viewPlayer}</Link><Link href={`/fc27/compare?a=${player.ea_player_id}`} className="compare">{labels.compare}</Link></div>
  </li>})}</ol>;
}
