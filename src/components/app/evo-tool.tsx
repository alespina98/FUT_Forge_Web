"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "../i18n-provider";

type PlayerResult = { resource_id: number; asset_id: number; name: string; rating: number | null; position: string | null };
type SearchSuccessEnvelope = { ok: true; data: { query: string; results: PlayerResult[] } };

type EvoStep = { index?: number; name?: string; rarity_name?: string };
type EvoStats = Record<string, number | null>;
type RankedChain = {
  rank: number;
  steps: EvoStep[];
  final_stats: EvoStats;
  total_boosts: EvoStats;
  fut_rating: number | null;
  meta_rating: number | null;
};
type AnalysisSuccessEnvelope = { ok: true; data: { ranked_chains: RankedChain[]; chains_found: number } };

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
  const [chain, setChain] = useState<RankedChain | null>(null);
  const [analysisError, setAnalysisError] = useState<ApiError | null>(null);

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearchStatus("loading");
    setSearchError(null);
    setSelected(null);
    setAnalysisStatus("idle");
    setChain(null);
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
    setChain(null);
    setAnalysisError(null);
  }

  function backToResults() {
    setSelected(null);
    setAnalysisStatus("idle");
    setChain(null);
    setAnalysisError(null);
  }

  async function runAnalysis() {
    if (!selected) return;
    setAnalysisStatus("loading");
    setAnalysisError(null);
    setChain(null);
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
        const best = body.data.ranked_chains[0];
        if (!best) {
          setAnalysisStatus("no_chains");
          return;
        }
        setChain(best);
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
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-white">{selected.name}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[.1em] text-white/35">
                  {selected.position ?? "—"} · {p.ratingLabel} {selected.rating ?? "—"}
                </p>
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

            {analysisStatus === "success" && chain && (
              <div className="glass rounded-2xl p-6 sm:p-8">
                <p className="font-mono text-[10px] uppercase tracking-[.12em] text-white/35">{p.bestPathHeading}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-white">
                  {chain.steps.map((step) => step.name || "EVO").join(" → ")}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[.1em] text-white/35">{p.futRatingLabel}</p>
                    <p className="mt-1 text-2xl font-semibold text-lime">{chain.fut_rating ?? "—"}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[.1em] text-white/35">{p.metaRatingLabel}</p>
                    <p className="mt-1 text-2xl font-semibold text-lime">{chain.meta_rating ?? "—"}</p>
                  </div>
                </div>

                <p className="mt-6 font-mono text-[10px] uppercase tracking-[.12em] text-white/35">{p.finalStatsLabel}</p>
                <dl className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {STAT_ORDER.map((key) => (
                    <div key={key}>
                      <dt className="font-mono text-[10px] uppercase tracking-[.1em] text-white/35">{key}</dt>
                      <dd className="mt-1 text-sm font-semibold text-white">{chain.final_stats?.[key] ?? "—"}</dd>
                    </div>
                  ))}
                </dl>

                {boostChips.length > 0 && (
                  <>
                    <p className="mt-6 font-mono text-[10px] uppercase tracking-[.12em] text-white/35">{p.boostsLabel}</p>
                    <p className="mt-2 text-sm font-semibold text-lime">
                      {boostChips.map((key) => {
                        const v = chain.total_boosts[key] as number;
                        return `${key} ${v > 0 ? "+" : ""}${v}`;
                      }).join("   ")}
                    </p>
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
