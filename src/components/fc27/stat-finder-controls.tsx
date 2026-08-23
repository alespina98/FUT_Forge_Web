"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/copy";
import type { FilterOptions } from "@/lib/fc27/players";
import { DETAIL_GROUPS, FACE_FILTERS, GK_FILTERS, STAT_FINDER_SORTS } from "@/lib/fc27/stat-finder-shared";

type Copy=Dictionary["fc27StatFinderPage"];
function NumberField({name,label,value,max=99}:{name:string;label:string;value?:string;max?:number}){return <label className="fc27-stat-field" htmlFor={`stat-${name}`}><span>{label}</span><input id={`stat-${name}`} name={name} type="number" inputMode="numeric" min="1" max={max} defaultValue={value}/></label>}

export function Fc27StatFinderControls({c,options,initial}:{c:Copy;options:FilterOptions;initial:Record<string,string>}){
  const router=useRouter();const [position,setPosition]=useState(initial.position??"");const isGK=position==="GK";const labels=c.attributes as Record<string,string>;const [advancedOpen,setAdvancedOpen]=useState(Object.keys(initial).some(k=>k.endsWith("Min")&&!['ovrMin'].includes(k)));
  function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);const params=new URLSearchParams();for(const [key,value] of data.entries()){const text=String(value).trim();if(text&&!(key==="sort"&&text==="overall"))params.set(key,text);}const query=params.toString();router.push(query?`/fc27/stat-finder?${query}`:"/fc27/stat-finder");}
  return <form className="fc27-stat-form" action="/fc27/stat-finder" method="get" onSubmit={submit}>
    <section className="fc27-stat-panel"><h2>{c.basicFilters}</h2><div className="fc27-stat-basic-grid">
      <label className="fc27-stat-field"><span>{c.playerName}</span><input name="q" type="search" defaultValue={initial.q} placeholder={c.playerPlaceholder}/></label>
      <label className="fc27-stat-field"><span>{c.position}</span><select name="position" value={position} onChange={e=>setPosition(e.target.value)}><option value="">{c.anyPosition}</option>{options.positions.map(v=><option key={v}>{v}</option>)}</select></label>
      <label className="fc27-stat-field"><span>{c.nation}</span><select name="nation" defaultValue={initial.nation}><option value="">{c.anyNation}</option>{options.nations.map(v=><option key={v}>{v}</option>)}</select></label>
      <label className="fc27-stat-field"><span>{c.league}</span><select name="league" defaultValue={initial.league}><option value="">{c.anyLeague}</option>{options.leagues.map(v=><option key={v}>{v}</option>)}</select></label>
      <label className="fc27-stat-field"><span>{c.club}</span><input name="club" defaultValue={initial.club} placeholder={c.anyClub}/></label>
      <NumberField name="ovrMin" label={c.ovrMin} value={initial.ovrMin}/><NumberField name="ovrMax" label={c.ovrMax} value={initial.ovrMax}/>
      <NumberField name="skillMovesMin" label={c.skillMoves} value={initial.skillMovesMin} max={5}/><NumberField name="weakFootMin" label={c.weakFoot} value={initial.weakFootMin} max={5}/>
      <label className="fc27-stat-field"><span>{c.preferredFoot}</span><select name="preferredFoot" defaultValue={initial.preferredFoot}><option value="">{c.anyFoot}</option><option value="Right">{c.rightFoot}</option><option value="Left">{c.leftFoot}</option></select></label>
      <label className="fc27-stat-field"><span>{c.sortBy}</span><select name="sort" defaultValue={initial.sort||"overall"}>{STAT_FINDER_SORTS.map(v=><option key={v} value={v}>{c.sort[v]}</option>)}</select></label>
    </div></section>
    <section className="fc27-stat-panel fc27-stat-advanced"><button type="button" className="fc27-stat-advanced-toggle" aria-expanded={advancedOpen} onClick={()=>setAdvancedOpen(v=>!v)}>{c.advancedStats}</button>{advancedOpen&&<div>
      {isGK?<div className="fc27-stat-group"><h3>{c.groups.goalkeeper}</h3><div className="fc27-stat-input-grid">{GK_FILTERS.map(([param])=><NumberField key={param} name={param} label={labels[param]} value={initial[param]}/>)}</div></div>:<>
        <div className="fc27-stat-group"><h3>{c.faceStats}</h3><div className="fc27-stat-input-grid">{FACE_FILTERS.map(([param])=><NumberField key={param} name={param} label={labels[param]} value={initial[param]}/>)}</div></div>
        {Object.entries(DETAIL_GROUPS).map(([group,fields])=><details className="fc27-stat-subgroup" key={group}><summary>{c.groups[group as keyof typeof c.groups]}</summary><div className="fc27-stat-input-grid">{fields.map(([param])=><NumberField key={param} name={param} label={labels[param]} value={initial[param]}/>)}</div></details>)}
      </>}
    </div>}</section>
    <div className="fc27-stat-submit"><button type="submit" className="button-primary">{c.searchPlayers}</button>{Object.keys(initial).length>0&&<Link href="/fc27/stat-finder" className="button-secondary">{c.resetFilters}</Link>}</div>
  </form>;
}
