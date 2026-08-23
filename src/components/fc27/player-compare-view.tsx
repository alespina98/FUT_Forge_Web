"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { Fc27PlayerSearchAutocomplete } from "./player-search-autocomplete";
import { Fc27BasePlayerCard } from "./fc27-base-player-card";
import { ATTRIBUTE_GROUPS, GK_STATS } from "./player-detail-view";
import { playerUrlSlug } from "@/lib/fc27/player-slug";
import type { PlayerDetail } from "@/lib/fc27/players";
import type { PlayerSuggestion } from "@/lib/fc27/player-search";

type Side = "a" | "b";
const FACE_KEYS = ["pace", "shooting", "passing", "dribbling", "defending", "physicality"] as const;
const OUT_LABELS = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"];
const GK_LABELS = ["DIV", "HAN", "KIC", "REF", "SPD", "POS"];

function card(player: PlayerDetail) {
  return <Fc27BasePlayerCard eaPlayerId={player.ea_player_id} overall={player.overall} position={player.position_short_label} playerName={player.display_name} commonName={player.common_name} avatarUrl={player.avatar_url} nationalityImageUrl={player.nationality_image_url} nationalityName={player.nationality_name} clubImageUrl={player.club_image_url} clubName={player.club_name} pace={player.pace} shooting={player.shooting} passing={player.passing} dribbling={player.dribbling} defending={player.defending} physicality={player.physicality} isGoalkeeper={player.position_short_label === "GK"} alternatePosition={player.alternate_positions[0]?.short_label ?? null} preferredFootCode={player.preferred_foot_code} skillMoves={player.skill_moves_raw} weakFoot={player.weak_foot} size="detail" />;
}

function WinnerValue({ value, other }: { value: number | null | undefined; other: number | null | undefined }) {
  const wins = value != null && other != null && value > other;
  return <span className={wins ? "fc27-compare-value winner" : "fc27-compare-value"}>{wins && <span aria-hidden>▲ </span>}{value ?? "—"}<span className="sr-only">{wins ? " winner" : ""}</span></span>;
}

export function Fc27CompareView({ aId, bId, playerA, playerB, baseMetaA, baseMetaB }: { aId: number | null; bId: number | null; playerA: PlayerDetail | null; playerB: PlayerDetail | null; baseMetaA: number | null; baseMetaB: number | null }) {
  const { t, locale } = useI18n();
  const c = t.fc27ComparePage;
  const d = t.fc27PlayerDetailPage;
  const router = useRouter(); const pathname = usePathname(); const current = useSearchParams();
  const duplicate = !!aId && aId === bId;
  const both = !!playerA && !!playerB && !duplicate;
  const aGK = playerA?.position_short_label === "GK"; const bGK = playerB?.position_short_label === "GK";

  function update(next: { a?: number | null; b?: number | null }) {
    const params = new URLSearchParams(current.toString());
    for (const side of ["a", "b"] as const) {
      if (!(side in next)) continue;
      if (next[side]) params.set(side, String(next[side]));
      else params.delete(side);
    }
    router.push(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
  }
  function select(side: Side, suggestion: PlayerSuggestion) { update({ [side]: suggestion.ea_player_id }); }
  function swap() { update({ a: bId, b: aId }); }

  const searchCopy = { searchLabel: c.searchPlayer, searchPlaceholder: c.searchPlayer, searching: c.searching, noResultsTitle: c.noResults };
  const selector = (side: Side, label: string, player: PlayerDetail | null, requested: number | null) => (
    <section className="fc27-compare-selector" aria-labelledby={`compare-${side}-label`}>
      <div className="fc27-compare-selector-head"><h2 id={`compare-${side}-label`}>{label}</h2>{requested && <button type="button" onClick={() => update({ [side]: null })} aria-label={`${c.clearPlayer}: ${label}`}>{c.clearPlayer}</button>}</div>
      <Fc27PlayerSearchAutocomplete initialQuery={player?.display_name ?? ""} onSelect={(p) => select(side, p)} inputId={`fc27-compare-${side}`} t={searchCopy} />
      {requested && !player && <p className="fc27-compare-warning" role="status">{c.invalidPlayer}</p>}
    </section>
  );

  const identity = (p: PlayerDetail) => {
    const foot = p.preferred_foot_code === 1 ? c.footRight : p.preferred_foot_code === 2 ? c.footLeft : "—";
    return <div className="fc27-compare-identity"><h3>{p.display_name}</h3><dl>{[[c.overall,p.overall],[c.position,p.position_short_label],[c.club,p.club_name ?? "—"],[c.nation,p.nationality_name],[c.league,p.league_name ?? "—"],[c.preferredFoot,foot],[c.skillMoves,`${Math.min(p.skill_moves_raw,5)}/5`],[c.weakFoot,`${Math.min(p.weak_foot,5)}/5`],[c.alternatePositions,p.alternate_positions.map(x=>x.short_label).join(", ") || "—"]].map(([label,value])=><div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><Link href={`/fc27/players/${playerUrlSlug(p.ea_player_id,p.slug)}`}>{c.viewPlayer}</Link></div>;
  };

  const faceWins = both && aGK === bGK ? FACE_KEYS.reduce((acc, key) => { const av=playerA[key], bv=playerB[key]; if(av==null||bv==null||av===bv) acc.ties++; else if(av>bv) acc.a++; else acc.b++; return acc; }, {a:0,b:0,ties:0}) : null;

  function faceRows() {
    if (!both) return null;
    if (aGK !== bGK) return <div className="fc27-compare-mixed"><p>{c.mixedNotice}</p><div className="fc27-compare-own-stats">{[playerA,playerB].map((p,i)=><div key={p.ea_player_id}><h3>{p.display_name}</h3>{FACE_KEYS.map((key,j)=><div key={key}><span>{(i===0?aGK:bGK)?GK_LABELS[j]:OUT_LABELS[j]}</span><b>{p[key] ?? "—"}</b></div>)}</div>)}</div></div>;
    const labels = aGK ? GK_LABELS : OUT_LABELS;
    return <div className="fc27-compare-rows">{FACE_KEYS.map((key,i)=><div className="fc27-compare-row" key={key}><WinnerValue value={playerA[key]} other={playerB[key]} /><span className="fc27-compare-row-label">{labels[i]}<small>{playerA[key]!=null&&playerB[key]!=null ? `${playerA[key]-playerB[key]>0?"+":""}${playerA[key]-playerB[key]}` : ""}</small></span><WinnerValue value={playerB[key]} other={playerA[key]} /></div>)}</div>;
  }

  function detailedRows() {
    if (!both) return null;
    const nameHeader = <div className="fc27-compare-name-header"><span title={playerA.display_name}>{playerA.display_name}</span><span aria-hidden /><span title={playerB.display_name}>{playerB.display_name}</span></div>;
    if (aGK !== bGK) return <div className="fc27-compare-detail-grid">{[playerA,playerB].map((p)=><section className="fc27-compare-detail-group" key={p.ea_player_id}><h3>{p.display_name} · {p.position_short_label === "GK" ? c.goalkeeperAttributes : c.outfieldAttributes}</h3>{p.position_short_label === "GK" ? GK_STATS.map(s=>{const v=p.goalkeeping[s.gk];return v&&<div className="fc27-compare-single-row" key={s.gk}><span>{d.stats[s.copy]}</span><b>{v.value}</b></div>}) : ATTRIBUTE_GROUPS.flatMap(g=>g.stats.map(s=>{const v=p.detailed_attributes[s.db];return v&&<div className="fc27-compare-single-row" key={s.db}><span>{d.stats[s.copy]}</span><b>{v.value}</b></div>}))}</section>)}</div>;
    if (aGK) return <section className="fc27-compare-detail-group"><h3>{c.goalkeeperAttributes}</h3>{nameHeader}{GK_STATS.map(s=>{const av=playerA.goalkeeping[s.gk]?.value,bv=playerB.goalkeeping[s.gk]?.value;if(av==null&&bv==null)return null;return <div className="fc27-compare-row" key={s.gk}><WinnerValue value={av} other={bv}/><span className="fc27-compare-row-label">{d.stats[s.copy]}</span><WinnerValue value={bv} other={av}/></div>})}</section>;
    return <div className="fc27-compare-detail-grid">{ATTRIBUTE_GROUPS.map(g=><section className="fc27-compare-detail-group" key={g.key}><h3>{d.groups[g.key]}</h3>{nameHeader}{g.stats.map(s=>{const av=playerA.detailed_attributes[s.db]?.value,bv=playerB.detailed_attributes[s.db]?.value;if(av==null&&bv==null)return null;return <div className="fc27-compare-row" key={s.db}><WinnerValue value={av} other={bv}/><span className="fc27-compare-row-label">{d.stats[s.copy]}</span><WinnerValue value={bv} other={av}/></div>})}</section>)}</div>;
  }

  return <div className="hero-grid fc27-compare-page relative px-4 pb-24 pt-40 sm:px-6 sm:pt-48"><div className="hero-noise"/><div className="hero-orb hero-orb-primary"/><div className="relative mx-auto max-w-6xl"><p className="section-label">{c.eyebrow}</p><h1 className="mt-3 text-4xl font-bold sm:text-6xl">{c.title}</h1><p className="mt-4 max-w-2xl text-white/55">{c.subtitle}</p>
    <div className="fc27-compare-selectors mt-10">{selector("a",c.playerA,playerA,aId)}<strong aria-hidden>{c.versus}</strong>{selector("b",c.playerB,playerB,bId)}</div>
    <div className="fc27-compare-actions"><button type="button" onClick={swap} disabled={!aId&&!bId}>{c.swap}</button><button type="button" onClick={()=>update({a:null,b:null})} disabled={!aId&&!bId}>{c.clearComparison}</button></div>
    {duplicate&&<p className="fc27-compare-warning center" role="status">{c.duplicatePlayer}</p>}
    {!both&&!duplicate&&<div className="fc27-compare-empty">{playerA||playerB?c.selectOther:c.selectTwo}</div>}
    {both&&<><section className="fc27-compare-cards" aria-label={c.attributes}><div>{card(playerA)}{identity(playerA)}</div><strong>{c.versus}</strong><div>{card(playerB)}{identity(playerB)}</div></section>
      <section className="fc27-compare-panel"><h2>{c.overall}</h2><div className="fc27-compare-row fc27-compare-overall"><WinnerValue value={playerA.overall} other={playerB.overall}/><span>{c.overall}</span><WinnerValue value={playerB.overall} other={playerA.overall}/></div></section>
      <section className="fc27-compare-panel fc27-compare-meta"><h2>{locale==="it"?"Meta Rating Base":"Base Meta Rating"}</h2><div className="fc27-compare-row fc27-compare-overall"><WinnerValue value={baseMetaA} other={baseMetaB}/><span>{locale==="it"?"Meta Rating Base":"Base Meta Rating"}</span><WinnerValue value={baseMetaB} other={baseMetaA}/></div><p>{locale==="it"?"Calcolato con i dati FC27 attualmente disponibili. PlayStyles, Ruoli e AcceleRATE saranno aggiunti quando EA li renderà disponibili.":"Calculated with currently available FC27 data. PlayStyles, Roles and AcceleRATE will be added when EA makes them available."}</p></section>
      <section className="fc27-compare-panel"><h2>{c.attributes}</h2>{faceRows()}</section>
      {faceWins&&<section className="fc27-compare-wins"><h2>{c.categoryWins}</h2><div><span>{playerA.display_name}<b>{faceWins.a}</b></span><span>{playerB.display_name}<b>{faceWins.b}</b></span><span>{c.ties}<b>{faceWins.ties}</b></span></div></section>}
      <section className="fc27-compare-panel"><h2>{c.detailedAttributes}</h2>{detailedRows()}</section></>}
  </div></div>;
}
