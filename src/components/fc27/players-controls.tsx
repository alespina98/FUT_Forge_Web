"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersIcon, RefreshIcon } from "@/components/icons";
import { Fc27PlayerSearchAutocomplete } from "./player-search-autocomplete";
import type { Dictionary } from "@/lib/copy";
import type { FilterOptions } from "@/lib/fc27/players";

type Fc27Copy = Dictionary["fc27PlayersPage"];

const SORT_KEYS = ["overall_desc", "overall_asc", "pace_desc", "shooting_desc", "passing_desc", "dribbling_desc", "defending_desc", "physicality_desc", "name_asc"] as const;
const SKILL_MOVES = [1, 2, 3, 4, 5] as const;
const WEAK_FOOT = [1, 2, 3, 4, 5] as const;
// URL param name (lowercase) -> copy label key, for the six face-stat min filters.
const FACE_STAT_FILTERS: Array<{ param: "pacemin" | "shootingmin" | "passingmin" | "dribblingmin" | "defendingmin" | "physicalitymin"; label: "paceMin" | "shootingMin" | "passingMin" | "dribblingMin" | "defendingMin" | "physicalityMin" }> = [
  { param: "pacemin", label: "paceMin" },
  { param: "shootingmin", label: "shootingMin" },
  { param: "passingmin", label: "passingMin" },
  { param: "dribblingmin", label: "dribblingMin" },
  { param: "defendingmin", label: "defendingMin" },
  { param: "physicalitymin", label: "physicalityMin" },
];

export function Fc27PlayersControls({ t, filterOptions }: { t: Fc27Copy; filterOptions: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeFilterKeys = ["position", "nation", "league", "club", "sk", "wf", "omin", "omax", "pacemin", "shootingmin", "passingmin", "dribblingmin", "defendingmin", "physicalitymin"];
  const hasActiveFilters = activeFilterKeys.some((key) => searchParams.get(key));
  // Reset button covers search too, not just structured filters - a
  // search-only no-results state still needs a one-click way out.
  const hasAnyQueryState = hasActiveFilters || !!searchParams.get("q");
  const [filtersOpen, setFiltersOpen] = useState(hasActiveFilters);

  function buildUrl(overrides: Record<string, string | null>): string {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    if (!("page" in overrides)) params.delete("page"); // any filter/sort/search change resets to page 1
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function setParam(key: string, value: string | null, replace = false) {
    const url = buildUrl({ [key]: value });
    if (replace) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  }

  function commitFullSearch(value: string) {
    setParam("q", value.trim() || null);
  }

  function resetFilters() {
    router.push(pathname, { scroll: false });
  }

  const sort = searchParams.get("sort") ?? "overall_desc";

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="fc27-toolbar">
        <Fc27PlayerSearchAutocomplete
          initialQuery={searchParams.get("q") ?? ""}
          onCommitSearch={commitFullSearch}
          t={{ searchLabel: t.searchLabel, searchPlaceholder: t.searchPlaceholder, searching: t.searching, noResultsTitle: t.noResultsTitle }}
        />
        <select className="select-dark fc27-sort-select" value={sort} onChange={(e) => setParam("sort", e.target.value === "overall_desc" ? null : e.target.value)} aria-label={t.sortLabel}>
          {SORT_KEYS.map((key) => <option key={key} value={key}>{t.sort[key]}</option>)}
        </select>
        <button type="button" onClick={() => setFiltersOpen((v) => !v)} className="button-secondary !min-h-[46px]" aria-expanded={filtersOpen}>
          <SlidersIcon className="size-4" />{t.filtersToggle}
        </button>
        {hasAnyQueryState && (
          <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/50 hover:text-white">
            <RefreshIcon className="size-3.5" />{t.resetFilters}
          </button>
        )}
      </div>

      {filtersOpen && (
        <div className="fc27-filters-panel">
          <div className="fc27-field">
            <label htmlFor="fc27-position">{t.position}</label>
            <select id="fc27-position" className="select-dark" value={searchParams.get("position") ?? ""} onChange={(e) => setParam("position", e.target.value || null)}>
              <option value="">{t.anyPosition}</option>
              {filterOptions.positions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="fc27-field">
            <label htmlFor="fc27-nation">{t.nation}</label>
            <select id="fc27-nation" className="select-dark" value={searchParams.get("nation") ?? ""} onChange={(e) => setParam("nation", e.target.value || null)}>
              <option value="">{t.anyNation}</option>
              {filterOptions.nations.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="fc27-field">
            <label htmlFor="fc27-league">{t.league}</label>
            <select id="fc27-league" className="select-dark" value={searchParams.get("league") ?? ""} onChange={(e) => setParam("league", e.target.value || null)}>
              <option value="">{t.anyLeague}</option>
              {filterOptions.leagues.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="fc27-field">
            <label htmlFor="fc27-club">{t.club}</label>
            <input id="fc27-club" type="text" defaultValue={searchParams.get("club") ?? ""} placeholder={t.clubPlaceholder}
              onBlur={(e) => setParam("club", e.target.value.trim() || null)}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
          </div>
          <div className="fc27-field">
            <label htmlFor="fc27-skill">{t.skillMoves}</label>
            <select id="fc27-skill" className="select-dark" value={searchParams.get("sk") ?? ""} onChange={(e) => setParam("sk", e.target.value || null)}>
              <option value="">{t.anySkillMoves}</option>
              {SKILL_MOVES.map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
            </select>
          </div>
          <div className="fc27-field">
            <label htmlFor="fc27-weakfoot">{t.weakFoot}</label>
            <select id="fc27-weakfoot" className="select-dark" value={searchParams.get("wf") ?? ""} onChange={(e) => setParam("wf", e.target.value || null)}>
              <option value="">{t.anyWeakFoot}</option>
              {WEAK_FOOT.map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
            </select>
          </div>
          <div className="fc27-field">
            <label htmlFor="fc27-omin">{t.overallMin}</label>
            <input id="fc27-omin" type="number" min={1} max={99} defaultValue={searchParams.get("omin") ?? ""} onBlur={(e) => setParam("omin", e.target.value || null)} />
          </div>
          <div className="fc27-field">
            <label htmlFor="fc27-omax">{t.overallMax}</label>
            <input id="fc27-omax" type="number" min={1} max={99} defaultValue={searchParams.get("omax") ?? ""} onBlur={(e) => setParam("omax", e.target.value || null)} />
          </div>
          {FACE_STAT_FILTERS.map(({ param, label }) => (
            <div className="fc27-field" key={param}>
              <label htmlFor={`fc27-${param}`}>{t[label]}</label>
              <input id={`fc27-${param}`} type="number" min={1} max={99} defaultValue={searchParams.get(param) ?? ""} onBlur={(e) => setParam(param, e.target.value || null)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
