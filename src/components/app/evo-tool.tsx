"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useI18n } from "../i18n-provider";
import { CardArt } from "./card-art";
import { GeneratedEvoCard } from "./generated-evo-card";

type PlayerResult = {
  resource_id: number;
  asset_id: number;
  name: string;
  rating: number | null;
  position: string | null;
  image_url: string | null;
};
type SearchSuccessEnvelope = { ok: true; data: { query: string; results: PlayerResult[] } };

type EvoStep = { index?: number; name?: string; rarity_name?: string; item_ea_id?: number | null; image_url?: string | null };
type EvoStats = Record<string, number | null>;
type RarityVisual = { image_url: string; text_color: string | null; line_color: string | null };
type RankedChain = {
  rank: number;
  length: number;
  steps: EvoStep[];
  final_stats: EvoStats;
  total_boosts: EvoStats;
  fut_rating: number | null;
  meta_rating: number | null;
  final_image_url?: string | null;
  final_cutout_url?: string | null;
  final_item_ea_id?: number | null;
  final_position?: string | null;
  final_rarity_visual?: RarityVisual | null;
};
type SortMode = "best" | "fut" | "ovr" | "fewest";
type AnalysisSuccessEnvelope = { ok: true; data: { player: { image_url: string | null }; ranked_chains: RankedChain[]; chains_found: number } };

type BackendErrorEnvelope = { ok: false; error: { code: string; message: string } };
type ApiError = { code: string; message: string };

type SearchStatus = "idle" | "loading" | "success" | "error";
type AnalysisStatus = "idle" | "loading" | "success" | "no_chains" | "error";

const DEPTH_OPTIONS = ["2", "3", "5", "10"] as const;
const STAT_ORDER = ["OVR", "PAC", "SHO", "PAS", "DRI", "DEF", "PHY", "SM", "WF"] as const;

function isSearchSuccess(value: unknown): value is SearchSuccessEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { ok?: unknown; data?: unknown };
  return v.ok === true && typeof v.data === "object" && v.data !== null && Array.isArray((v.data as { results?: unknown }).results);
}

function isAnalysisSuccess(value: unknown): value is AnalysisSuccessEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { ok?: unknown; data?: unknown };
  return v.ok === true && typeof v.data === "object" && v.data !== null && Array.isArray((v.data as { ranked_chains?: unknown }).ranked_chains);
}

function isBackendError(value: unknown): value is BackendErrorEnvelope {
  return typeof value === "object" && value !== null && (value as { ok?: unknown }).ok === false;
}

function ErrorPanel({ title, message, code }: { title: string; message: string; code?: string }) {
  return (
    <div className="rounded-xl border border-red-500/25 bg-red-500/[.06] p-4" role="alert">
      <p className="text-sm font-semibold text-red-300">{title}</p>
      <p className="mt-1 text-sm text-white/60">{message}</p>
      {code && <p className="mt-2 font-mono text-[10px] uppercase tracking-[.12em] text-white/30">{code}</p>}
    </div>
  );
}

export function EvoTool() {
  const { t } = useI18n();
  const p = t.app.evo;

  const [query, setQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [searchError, setSearchError] = useState<ApiError | null>(null);

  const [selected, setSelected] = useState<PlayerResult | null>(null);
  const [depth, setDepth] = useState<string>("3");
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [chains, setChains] = useState<RankedChain[]>([]);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("best");
  const [analysisError, setAnalysisError] = useState<ApiError | null>(null);
  const [startingCardUrl, setStartingCardUrl] = useState<string | null>(null);

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearchStatus("loading");
    setSearchError(null);
    setSelected(null);
    setAnalysisStatus("idle");
    setChains([]);
    setSelectedRank(null);
    setStartingCardUrl(null);
    try {
      const response = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const body: unknown = await response.json().catch(() => null);
      if (isSearchSuccess(body)) {
        setResults(body.data.results);
        setSearchStatus("success");
        return;
      }
      setSearchError({ code: isBackendError(body) ? body.error.code : "unexpected_response", message: p.genericError });
      setSearchStatus("error");
    } catch {
      setSearchError({ code: "network_error", message: p.networkError });
      setSearchStatus("error");
    }
  }

  function selectCard(card: PlayerResult) {
    setSelected(card);
    setAnalysisStatus("idle");
    setChains([]);
    setSelectedRank(null);
    setSortMode("best");
    setAnalysisError(null);
    setStartingCardUrl(null);
  }

  function backToResults() {
    setSelected(null);
    setAnalysisStatus("idle");
    setChains([]);
    setSelectedRank(null);
    setSortMode("best");
    setAnalysisError(null);
    setStartingCardUrl(null);
  }

  async function runAnalysis() {
    if (!selected) return;
    setAnalysisStatus("loading");
    setAnalysisError(null);
    setChains([]);
    setSelectedRank(null);
    setSortMode("best");
    setStartingCardUrl(null);
    try {
      const response = await fetch("/api/evo/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_id: selected.resource_id,
          asset_id: selected.asset_id,
          max_evolutions: Number(depth),
        }),
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      if (isAnalysisSuccess(body)) {
        const ranked = body.data.ranked_chains;
        if (ranked.length === 0) {
          setAnalysisStatus("no_chains");
          return;
        }
        setChains(ranked);
        setSelectedRank(ranked[0].rank);
        setStartingCardUrl(body.data.player?.image_url ?? null);
        setAnalysisStatus("success");
        return;
      }
      setAnalysisError({ code: isBackendError(body) ? body.error.code : "unexpected_response", message: p.genericError });
      setAnalysisStatus("error");
    } catch {
      setAnalysisError({ code: "network_error", message: p.networkError });
      setAnalysisStatus("error");
    }
  }

  const sortedChains = useMemo(() => {
    const rows = [...chains];
    // "fut" sorts by fut_rating - the same value now shown to the user as
    // "META Rating" everywhere in this tool. The old meta_rating metric is
    // never surfaced, so it has no corresponding sort option.
    if (sortMode === "fut") rows.sort((a, b) => (b.fut_rating ?? -1) - (a.fut_rating ?? -1));
    else if (sortMode === "ovr") rows.sort((a, b) => (b.final_stats?.OVR ?? 0) - (a.final_stats?.OVR ?? 0));
    else if (sortMode === "fewest") rows.sort((a, b) => (a.length ?? 99) - (b.length ?? 99));
    return rows;
  }, [chains, sortMode]);

  const chain = chains.find((c) => c.rank === selectedRank) ?? null;

  // FUT.GG only has a real, distinct card render for an evolution's end
  // state when that state coincides with an actual catalog item
  // (final_item_ea_id non-null). Otherwise - the common case - there is no
  // genuine full-card render to resolve, so the final card is composed
  // locally from verified public data (GeneratedEvoCard), same principle
  // FUT Forge Desktop uses for this exact case. "none" only when even that
  // data (final_rarity_visual) is unavailable.
  const finalCardMode: "real" | "generated" | "none" =
    chain && chain.final_item_ea_id != null ? "real" : chain?.final_rarity_visual ? "generated" : "none";

  const boostChips = chain
    ? STAT_ORDER.filter((k) => {
        const v = chain.total_boosts?.[k];
        return typeof v === "number" && v !== 0;
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      <p className="section-label">{p.eyebrow}</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">{p.title}</h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-white/50">{p.lead}</p>

      {!selected && (
        <>
          <form onSubmit={runSearch} className="glass mt-8 flex flex-col gap-3 rounded-2xl p-6 sm:flex-row sm:items-center sm:p-8">
            <label className="sr-only" htmlFor="evo-search">{p.searchLabel}</label>
            <input
              id="evo-search"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={p.searchPlaceholder}
              className="min-h-12 flex-1 rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm text-white placeholder:text-white/30 focus:border-lime/40 focus:outline-none"
            />
            <button type="submit" className="button-primary sm:min-w-[140px]" disabled={searchStatus === "loading" || !query.trim()}>
              {searchStatus === "loading" ? p.searchingButton : p.searchButton}
            </button>
          </form>

          <div className="mt-6" aria-live="polite">
            {searchStatus === "idle" && <p className="text-sm text-white/40">{p.searchEmptyState}</p>}

            {searchStatus === "error" && searchError && (
              <ErrorPanel title={p.searchErrorTitle} message={searchError.message} code={searchError.code} />
            )}

            {searchStatus === "success" && (
              results.length === 0 ? (
                <p className="text-sm text-white/40">{p.noResults}</p>
              ) : (
                <div className="glass rounded-2xl p-2">
                  <p className="px-4 pt-3 font-mono text-[10px] uppercase tracking-[.14em] text-white/35">{p.resultsHeading}</p>
                  <ul className="mt-2 flex flex-col">
                    {results.map((card) => (
                      <li key={card.resource_id}>
                        <button
                          type="button"
                          onClick={() => selectCard(card)}
                          className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-white/[.04]"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-white">{card.name}</span>
                            <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[.1em] text-white/35">
                              {card.position ?? "—"} · {p.ratingLabel} {card.rating ?? "—"}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-lime">{p.selectCard} →</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            )}
          </div>
        </>
      )}

      {selected && (
        <div className="mt-8">
          <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <CardArt src={selected.image_url} alt={selected.name} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-white">{selected.name}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[.1em] text-white/35">
                    {selected.position ?? "—"} · {p.ratingLabel} {selected.rating ?? "—"}
                  </p>
                </div>
              </div>
              <button type="button" onClick={backToResults} className="shrink-0 text-xs font-semibold text-white/50 hover:text-white">
                ← {p.backToResults}
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[.1em] text-white/40">{p.depthLabel}</span>
                <select
                  value={depth}
                  onChange={(event) => setDepth(event.target.value)}
                  className="select-dark min-h-12 rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm text-white focus:border-lime/40 focus:outline-none"
                >
                  {DEPTH_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={runAnalysis} className="button-primary" disabled={analysisStatus === "loading"}>
                {analysisStatus === "loading" ? p.analyzingButton : p.analyzeButton}
              </button>
            </div>
          </div>

          <div className="mt-6" aria-live="polite">
            {analysisStatus === "idle" && <p className="text-sm text-white/40">{p.analysisEmptyState}</p>}

            {analysisStatus === "loading" && <p className="text-sm text-white/50" role="status">{p.analyzingButton}</p>}

            {analysisStatus === "no_chains" && <p className="text-sm text-white/40">{p.noChainsFound}</p>}

            {analysisStatus === "error" && analysisError && (
              <ErrorPanel title={p.analysisErrorTitle} message={analysisError.message} code={analysisError.code} />
            )}

            {analysisStatus === "success" && chains.length > 0 && (
              <div className="glass mb-6 rounded-2xl p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[.12em] text-white/35">{p.pathsHeading}</p>
                    <p className="mt-1 text-sm text-white/50">{p.pathsSubheading}</p>
                  </div>
                  <label className="flex flex-col gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-[.1em] text-white/40">{p.sortLabel}</span>
                    <select
                      value={sortMode}
                      onChange={(event) => setSortMode(event.target.value as SortMode)}
                      className="select-dark min-h-10 rounded-xl border border-white/10 bg-white/[.03] px-3 text-sm text-white focus:border-lime/40 focus:outline-none"
                    >
                      <option value="best">{p.sortBest}</option>
                      <option value="fut">{p.sortMetaRating}</option>
                      <option value="ovr">{p.sortOvr}</option>
                      <option value="fewest">{p.sortFewest}</option>
                    </select>
                  </label>
                </div>

                <ul className="mt-4 flex flex-col gap-2">
                  {sortedChains.map((rc) => {
                    const isSelected = rc.rank === selectedRank;
                    return (
                      <li key={rc.rank}>
                        <button
                          type="button"
                          onClick={() => setSelectedRank(rc.rank)}
                          aria-pressed={isSelected}
                          className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                            isSelected ? "border-lime/40 bg-lime/[.06]" : "border-white/10 bg-white/[.02] hover:bg-white/[.04]"
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                              isSelected ? "bg-lime text-black" : "bg-white/10 text-white/70"
                            }`}
                          >
                            {rc.rank}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-white">
                              {rc.steps.map((s) => s.name || p.stepFallbackName).join(" → ")}
                            </span>
                            <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[.1em] text-white/35">
                              {rc.length} {p.evoCountLabel} · OVR {rc.final_stats?.OVR ?? "—"}
                            </span>
                          </span>
                          {/* Displays fut_rating under the "META Rating" label - see the
                              product decision noted by the detail panel below. */}
                          <span className="shrink-0 text-right">
                            <span className="block font-mono text-[10px] uppercase tracking-[.1em] text-white/35">{p.metaRatingLabel}</span>
                            <span className="block text-sm font-semibold text-lime">{rc.fut_rating ?? "—"}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {analysisStatus === "success" && chain && (
              <div className="glass rounded-2xl p-6 sm:p-8">
                <p className="font-mono text-[10px] uppercase tracking-[.12em] text-white/35">
                  {chain.rank === 1 ? p.bestPathHeading : `${p.pathHeadingPrefix} #${chain.rank}`}
                </p>

                <div className="mt-4 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                  <div className="flex flex-col items-center gap-2 sm:shrink-0">
                    <CardArt src={startingCardUrl} alt={selected.name} size="lg" />
                    <span className="max-w-[9rem] truncate text-center text-[11px] font-semibold text-white">{p.startingCardLabel}</span>
                  </div>

                  <span className="text-white/20 sm:hidden" aria-hidden>↓</span>
                  <span className="hidden text-white/20 sm:block" aria-hidden>→</span>

                  <div className="glass min-w-0 flex-1 rounded-xl p-4">
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {chain.steps.map((step, index) => {
                        const hasDistinctArt = Boolean(
                          step.image_url && step.item_ea_id != null && step.item_ea_id !== selected.resource_id
                        );
                        return (
                          <div key={index} className="flex items-center gap-3">
                            {index > 0 && <span className="text-white/20" aria-hidden>→</span>}
                            {hasDistinctArt ? (
                              <div className="flex flex-col items-center gap-2">
                                <CardArt src={step.image_url} alt={step.name || p.stepFallbackName} size="sm" />
                                <span className="max-w-[6rem] truncate text-center text-[10px] font-semibold text-white/70">{step.name}</span>
                              </div>
                            ) : (
                              <span className="rounded-full border border-lime/20 bg-lime/[.06] px-3 py-1.5 text-xs font-semibold text-lime">
                                {step.name || p.stepFallbackName}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <span className="text-white/20 sm:hidden" aria-hidden>↓</span>
                  <span className="hidden text-white/20 sm:block" aria-hidden>→</span>

                  <div className="flex flex-col items-center gap-2 sm:shrink-0">
                    {finalCardMode === "real" && <CardArt src={chain.final_image_url ?? null} alt={selected.name} size="lg" />}
                    {finalCardMode === "generated" && chain.final_rarity_visual && (
                      <GeneratedEvoCard
                        rarityImageUrl={chain.final_rarity_visual.image_url}
                        textColor={chain.final_rarity_visual.text_color}
                        cutoutUrl={chain.final_cutout_url ?? null}
                        ovr={chain.final_stats?.OVR ?? null}
                        position={chain.final_position ?? null}
                        name={selected.name}
                        stats={{
                          PAC: chain.final_stats?.PAC ?? null,
                          SHO: chain.final_stats?.SHO ?? null,
                          PAS: chain.final_stats?.PAS ?? null,
                          DRI: chain.final_stats?.DRI ?? null,
                          DEF: chain.final_stats?.DEF ?? null,
                          PHY: chain.final_stats?.PHY ?? null,
                        }}
                        size="lg"
                      />
                    )}
                    {finalCardMode === "none" && <CardArt src={null} alt={selected.name} size="lg" />}
                    <span className="max-w-[9rem] truncate text-center text-[11px] font-semibold text-lime">{p.finalResultLabel}</span>
                  </div>
                </div>

                {/* Product decision: display the FUT Rating value under a "META Rating" label.
                    The calculation is untouched - only the label shown to the user changes. */}
                <div className="mt-5">
                  <p className="font-mono text-[10px] uppercase tracking-[.1em] text-white/35">{p.metaRatingLabel}</p>
                  <p className="mt-1 text-2xl font-semibold text-lime">{chain.fut_rating ?? "—"}</p>
                </div>

                {boostChips.length > 0 && (
                  <>
                    <p className="mt-6 font-mono text-[10px] uppercase tracking-[.12em] text-white/35">{p.boostsLabel}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {boostChips.map((key) => {
                        const v = chain.total_boosts[key] as number;
                        return (
                          <div key={key} className="flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-white/[.02] px-3 py-2">
                            <span className="font-mono text-[10px] uppercase tracking-[.1em] text-white/35">{key}</span>
                            <span className="text-sm font-semibold text-lime">{v > 0 ? "+" : ""}{v}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs leading-5 text-white/30">{p.disclaimer}</p>
    </div>
  );
}
