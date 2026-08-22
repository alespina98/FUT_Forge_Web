"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshIcon } from "@/components/icons";
import type { FilterOptions } from "@/lib/fc27/players";
import { RANKING_STATS, type RankingStat } from "@/lib/fc27/rankings-shared";
import type { Dictionary } from "@/lib/copy";

type Copy = Dictionary["fc27RankingsPage"];

export function Fc27RankingsControls({ t, options, stat }: { t: Copy; options: FilterOptions; stat: RankingStat }) {
  const router = useRouter(); const pathname = usePathname(); const current = useSearchParams();
  function url(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(current.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value) params.set(key, value); else params.delete(key);
    }
    const query = params.toString(); return query ? `${pathname}?${query}` : pathname;
  }
  function set(key: string, value: string | null, replace = false) { router[replace ? "replace" : "push"](url({ [key]: value }), { scroll: false }); }
  const filtered = ["position", "nation", "club", "league"].some((key) => current.get(key));
  return <div className="fc27-rankings-controls">
    <div className="fc27-ranking-tabs" role="tablist" aria-label={t.categoryLabel}>
      {RANKING_STATS.map((key) => <button key={key} type="button" role="tab" aria-selected={stat === key} className={stat === key ? "active" : ""} onClick={() => set("stat", key === "overall" ? null : key)}>{t.shortStats[key]}</button>)}
    </div>
    <div className="fc27-ranking-filters">
      <label><span>{t.position}</span><select value={current.get("position") ?? ""} onChange={(e) => set("position", e.target.value || null)}><option value="">{t.allPositions}</option>{options.positions.map(v=><option key={v}>{v}</option>)}</select></label>
      <label><span>{t.nation}</span><select value={current.get("nation") ?? ""} onChange={(e) => set("nation", e.target.value || null)}><option value="">{t.allNations}</option>{options.nations.map(v=><option key={v}>{v}</option>)}</select></label>
      <label><span>{t.league}</span><select value={current.get("league") ?? ""} onChange={(e) => set("league", e.target.value || null)}><option value="">{t.allLeagues}</option>{options.leagues.map(v=><option key={v}>{v}</option>)}</select></label>
      <label><span>{t.club}</span><input type="text" defaultValue={current.get("club") ?? ""} placeholder={t.anyClub} onBlur={(e)=>set("club",e.target.value.trim()||null)} onKeyDown={(e)=>{if(e.key==="Enter")(e.target as HTMLInputElement).blur();}} /></label>
      {filtered&&<button type="button" className="fc27-ranking-reset" onClick={()=>router.push(pathname,{scroll:false})}><RefreshIcon className="size-3.5"/>{t.resetFilters}</button>}
    </div>
  </div>;
}
