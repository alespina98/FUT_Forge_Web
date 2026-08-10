"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useI18n } from "../i18n-provider";
import type { Dictionary, Locale } from "@/lib/copy";
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
type CardArtSuccessEnvelope = { ok: true; data: { resource_id: number; image_url: string | null } };

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
type EvoRequirementText = { label: string; value: string; maxValue?: string | null };
type EvoMeta = {
  id?: number | null;
  name?: string | null;
  coinsCost?: number | null;
  pointsCost?: number | null;
  tokenCost?: number | null;
  endTime?: string | null;
  isExpired?: boolean | null;
  repeatabilityCount?: number | null;
  requirementsText?: EvoRequirementText[] | null;
  url?: string | null;
};
type ApplicableEvolution = {
  name: string;
  evolution_id: number | string | null;
  evolution: EvoMeta | null;
  rarity_name: string | null;
  boosts: EvoStats;
  final_stats?: EvoStats;
  image_url?: string | null;
  final_image_url?: string | null;
  final_item_ea_id?: number | null;
  final_position?: string | null;
  final_rarity_visual?: RarityVisual | null;
};
type EligibleFilter = "all" | "free" | "paid";
type EligibleSort = "best" | "ovr" | "expiry" | "cost";
const ELIGIBLE_PAGE_SIZE = 3;
const CHAIN_PAGE_SIZE = 3;
type AnalysisSuccessEnvelope = {
  ok: true;
  data: { player: { image_url: string | null }; ranked_chains: RankedChain[]; chains_found: number; applicable?: ApplicableEvolution[] };
};

type BackendErrorEnvelope = { ok: false; error: { code: string; message: string } };
type ApiError = { code: string; message: string };

type SearchStatus = "idle" | "loading" | "success" | "error";
type AnalysisStatus = "idle" | "loading" | "success" | "no_chains" | "error";

const DEPTH_OPTIONS = ["2", "3", "5", "10"] as const;
const STAT_ORDER = ["OVR", "PAC", "SHO", "PAS", "DRI", "DEF", "PHY", "SM", "WF"] as const;
type StatKey = (typeof STAT_ORDER)[number];

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

function isCardArtSuccess(value: unknown): value is CardArtSuccessEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { ok?: unknown; data?: unknown };
  return v.ok === true && typeof v.data === "object" && v.data !== null && "image_url" in (v.data as object);
}

function isBackendError(value: unknown): value is BackendErrorEnvelope {
  return typeof value === "object" && value !== null && (value as { ok?: unknown }).ok === false;
}

// coinsCost/pointsCost/tokenCost are genuine, distinct evolutions-API cost
// fields - only pointsCost is real money (FC Points), so that's the sole
// signal used for the free/paid badge. When more than one is non-zero they
// are ALTERNATIVE payment methods for the same evolution (pay with coins OR
// with points), never a combined total - so this joins them with "OR"/"O",
// never "+". Formats only whichever costs the API actually reports; never
// fabricates a cost when it reports none.
function formatEligibleCost(
  meta: EvoMeta | null | undefined,
  locale: Locale,
  unitPoints: string,
  unitCoins: string,
  unitTokens: string,
  unitOr: string,
): string | null {
  if (!meta) return null;
  const numberLocale = locale === "it" ? "it-IT" : "en-US";
  const parts: string[] = [];
  if (typeof meta.pointsCost === "number" && meta.pointsCost > 0) parts.push(`${meta.pointsCost.toLocaleString(numberLocale)} ${unitPoints}`);
  if (typeof meta.coinsCost === "number" && meta.coinsCost > 0) parts.push(`${meta.coinsCost.toLocaleString(numberLocale)} ${unitCoins}`);
  if (typeof meta.tokenCost === "number" && meta.tokenCost > 0) parts.push(`${meta.tokenCost.toLocaleString(numberLocale)} ${unitTokens}`);
  return parts.length > 0 ? parts.join(` ${unitOr} `) : null;
}

// Only pointsCost is real money (FC Points) - coins/tokens are earned
// in-game, so this is the same free/paid signal formatEligibleCost's badge
// text already implies, extracted for filtering/counting.
function isFreeEvolution(evo: ApplicableEvolution): boolean {
  return !(typeof evo.evolution?.pointsCost === "number" && evo.evolution.pointsCost > 0);
}

// Mirrors the primary component of the backend's own _quality() ranking
// (sum of the six face stats) - the same "best overall" signal already
// used to order ranked_chains - so "Best result" sorts consistently with
// the rest of the tool instead of inventing a new metric.
function evoQualityScore(evo: ApplicableEvolution): number {
  const s = evo.final_stats;
  if (!s) return -1;
  return (s.PAC ?? 0) + (s.SHO ?? 0) + (s.PAS ?? 0) + (s.DRI ?? 0) + (s.DEF ?? 0) + (s.PHY ?? 0);
}

// FC Points are real money and coins/tokens are earned in-game currencies -
// they can't be honestly converted into one number, so points-cost
// evolutions simply sort after every coin/token-only one; ties break by
// the coins+tokens actually required. Never fabricates a cross-currency price.
function evoCostSortKey(evo: ApplicableEvolution): number {
  const meta = evo.evolution;
  const points = typeof meta?.pointsCost === "number" ? meta.pointsCost : 0;
  const coins = typeof meta?.coinsCost === "number" ? meta.coinsCost : 0;
  const tokens = typeof meta?.tokenCost === "number" ? meta.tokenCost : 0;
  return points > 0 ? 1_000_000_000 + coins + tokens : coins + tokens;
}

function evoExpirySortKey(evo: ApplicableEvolution): number {
  const endTime = evo.evolution?.endTime;
  const ts = endTime ? new Date(endTime).getTime() : NaN;
  return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts;
}

function topBoostEntries(boosts: EvoStats, limit = 4): { key: StatKey; value: number }[] {
  const nonZero: { key: StatKey; value: number }[] = [];
  for (const key of STAT_ORDER) {
    if (key === "OVR") continue;
    const value = boosts?.[key];
    if (typeof value === "number" && value !== 0) nonZero.push({ key, value });
  }
  return nonZero.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, limit);
}

function BoostChip({ statKey, value }: { statKey: string; value: number }) {
  return (
    <span className="rounded-md border border-white/10 bg-white/[.02] px-1.5 py-0.5 font-mono text-[10px] text-white/60">
      {statKey} {value > 0 ? "+" : ""}
      {value}
    </span>
  );
}

// Compact grid card for one eligible evolution. Card artwork reuses the
// exact real-vs-generated decision the chain detail view already makes
// (final_item_ea_id != null => genuine catalog render; otherwise
// GeneratedEvoCard from final_rarity_visual, same as everywhere else in
// this tool) - never a bare cutout, never a blank box.
function EligibleEvolutionCard({
  evo,
  playerName,
  locale,
  p,
  isExpanded,
  onToggleDetails,
}: {
  evo: ApplicableEvolution;
  playerName: string;
  locale: Locale;
  p: Dictionary["app"]["evo"];
  isExpanded: boolean;
  onToggleDetails: () => void;
}) {
  const meta = evo.evolution;
  const isPaid = typeof meta?.pointsCost === "number" && meta.pointsCost > 0;
  const cardMode: "real" | "generated" | "none" =
    evo.final_item_ea_id != null ? "real" : evo.final_rarity_visual ? "generated" : "none";
  // Collapsed preview keeps only the 2 largest boosts so the row stays
  // compact on desktop - the full list is always in the expanded details.
  const topBoosts = topBoostEntries(evo.boosts, 2);
  const allBoosts = STAT_ORDER.filter((k) => k !== "OVR").filter((k) => {
    const v = evo.boosts?.[k];
    return typeof v === "number" && v !== 0;
  });
  const cost = formatEligibleCost(meta, locale, p.eligiblePaidBadge, p.eligibleCoinsUnit, p.eligibleTokensUnit, p.eligibleCostOr);
  const ends = meta?.endTime ? new Date(meta.endTime) : null;
  const hasValidEndDate = ends !== null && !Number.isNaN(ends.getTime());
  const requirements = (meta?.requirementsText ?? []).filter((r) => r.value);
  const endsText = hasValidEndDate
    ? `${p.eligibleEndsLabel} ${ends!.toLocaleDateString(locale === "it" ? "it-IT" : "en-US", { year: "numeric", month: "short", day: "numeric" })}`
    : null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[.02] p-4 lg:p-3">
      {/* Stacked card below lg (unchanged look); single compact row from lg up
          so more eligible evolutions fit on a desktop screen at once.
          lg:flex-wrap is the overflow guard: if the OVR/badge/boosts/expiry/
          button content can't all fit on one line at the column's actual
          width, it wraps to a second line inside the card instead of
          spilling past the right edge - nothing is ever clipped/hidden. */}
      <div className="flex flex-col items-center gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-3 lg:gap-y-2">
        <div className="shrink-0">
          {cardMode === "real" && <CardArt src={evo.final_image_url ?? null} alt={evo.name} size="sm" />}
          {cardMode === "generated" && evo.final_rarity_visual && (
            <GeneratedEvoCard
              rarityImageUrl={evo.final_rarity_visual.image_url}
              textColor={evo.final_rarity_visual.text_color}
              cutoutUrl={evo.image_url ?? null}
              ovr={evo.final_stats?.OVR ?? null}
              position={evo.final_position ?? null}
              name={playerName}
              stats={{
                PAC: evo.final_stats?.PAC ?? null,
                SHO: evo.final_stats?.SHO ?? null,
                PAS: evo.final_stats?.PAS ?? null,
                DRI: evo.final_stats?.DRI ?? null,
                DEF: evo.final_stats?.DEF ?? null,
                PHY: evo.final_stats?.PHY ?? null,
              }}
              size="sm"
            />
          )}
          {cardMode === "none" && <CardArt src={null} alt={evo.name} size="sm" />}
        </div>

        <div className="min-w-0 text-center lg:flex-1 lg:text-left">
          <p className="truncate text-sm font-semibold text-white">{evo.name}</p>
          {evo.rarity_name && <p className="mt-0.5 truncate text-[11px] text-white/40">{evo.rarity_name}</p>}
          {/* Real cost only rendered here when non-free - "OR" between
              alternative payment methods, never summed. Hidden below lg to
              match the pre-existing stacked-card preview (full cost/badge
              still live in the expanded details either way). */}
          {isPaid && cost && <p className="mt-0.5 hidden truncate text-[10px] text-white/40 lg:block">{cost}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
          <span className="font-mono text-xs font-bold text-lime">OVR {evo.final_stats?.OVR ?? "—"}</span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[.08em] ${
              isPaid ? "border-white/15 bg-white/[.04] text-white/70" : "border-lime/30 bg-lime/[.06] text-lime"
            }`}
          >
            {isPaid ? p.eligiblePaidBadge : p.eligibleFreeBadge}
          </span>
          {topBoosts.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {topBoosts.map(({ key, value }) => (
                <BoostChip key={key} statKey={key} value={value} />
              ))}
            </div>
          )}
        </div>

        {endsText && <p className="hidden shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-[.06em] text-white/35 lg:block">{endsText}</p>}

        <button
          type="button"
          onClick={onToggleDetails}
          aria-expanded={isExpanded}
          className="mt-1 shrink-0 text-xs font-semibold text-lime hover:underline lg:mt-0"
        >
          {isExpanded ? p.eligibleHideDetails : p.eligibleViewDetails}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3">
          {typeof meta?.repeatabilityCount === "number" && meta.repeatabilityCount > 1 && (
            <span className="w-fit rounded-full border border-white/15 bg-white/[.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[.08em] text-white/60">
              {p.eligibleRepeatableBadge}
            </span>
          )}

          {cost && <p className="text-xs text-white/50">{cost}</p>}
          {endsText && <p className="font-mono text-[10px] uppercase tracking-[.08em] text-white/35">{endsText}</p>}

          {evo.rarity_name && (
            <p className="text-xs font-semibold text-lime">
              {p.eligibleResultLabel}: {evo.rarity_name}
              {evo.final_stats?.OVR != null ? ` · ${evo.final_stats.OVR} OVR` : ""}
            </p>
          )}

          {allBoosts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allBoosts.map((k) => (
                <BoostChip key={k} statKey={k} value={evo.boosts[k] as number} />
              ))}
            </div>
          )}

          {requirements.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.08em] text-white/35">{p.eligibleRequirementsLabel}</p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {requirements.map((r, i) => (
                  <li key={i} className="text-xs text-white/50">
                    {r.label}: {r.value}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Compact horizontal summary for one ranked chain in the "Best chains"
// column. Presents the exact same RankedChain fields the (unchanged) chain
// detail panel below already renders - a new compact PRESENTATION of the
// same data, not a new computation. The real-vs-generated final-card choice
// mirrors that panel's own finalCardMode logic exactly. Intermediate steps
// are summarized as a step-count pill rather than a full art trail: chains
// can be up to 10 steps deep, and a fixed start+final pair keeps every row
// the same predictable width regardless of chain length - the full
// step-by-step trail remains one click away via "Chain details".
function ChainRow({
  chain,
  isSelected,
  onSelect,
  startingCardUrl,
  playerName,
  p,
}: {
  chain: RankedChain;
  isSelected: boolean;
  onSelect: () => void;
  startingCardUrl: string | null;
  playerName: string;
  p: Dictionary["app"]["evo"];
}) {
  const finalMode: "real" | "generated" | "none" =
    chain.final_item_ea_id != null ? "real" : chain.final_rarity_visual ? "generated" : "none";
  const boosts = STAT_ORDER.filter((k) => k !== "OVR")
    .filter((k) => {
      const v = chain.total_boosts?.[k];
      return typeof v === "number" && v !== 0;
    })
    .slice(0, 3);

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border p-3 transition lg:flex-row lg:flex-wrap lg:items-center lg:gap-4 ${
        isSelected ? "border-lime/40 bg-lime/[.06]" : "border-white/10 bg-white/[.02]"
      }`}
    >
      <div className="flex items-center gap-3 lg:shrink-0">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
            isSelected ? "bg-lime text-black" : "bg-white/10 text-white/70"
          }`}
        >
          {chain.rank}
        </span>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.08em] text-white/35">{p.metaRatingLabel}</p>
          <p className="text-lg font-semibold text-lime">{chain.fut_rating ?? "—"}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 lg:shrink-0">
        <CardArt src={startingCardUrl} alt={playerName} size="xs" />
        <span className="text-white/20" aria-hidden>→</span>
        <span className="whitespace-nowrap rounded-full border border-white/10 bg-white/[.03] px-2 py-1 text-[10px] font-semibold text-white/60">
          {chain.length} {p.evoCountLabel}
        </span>
        <span className="text-white/20" aria-hidden>→</span>
        {finalMode === "real" && <CardArt src={chain.final_image_url ?? null} alt={playerName} size="xs" />}
        {finalMode === "generated" && chain.final_rarity_visual && (
          <GeneratedEvoCard
            rarityImageUrl={chain.final_rarity_visual.image_url}
            textColor={chain.final_rarity_visual.text_color}
            cutoutUrl={chain.final_cutout_url ?? null}
            ovr={chain.final_stats?.OVR ?? null}
            position={chain.final_position ?? null}
            name={playerName}
            stats={{
              PAC: chain.final_stats?.PAC ?? null,
              SHO: chain.final_stats?.SHO ?? null,
              PAS: chain.final_stats?.PAS ?? null,
              DRI: chain.final_stats?.DRI ?? null,
              DEF: chain.final_stats?.DEF ?? null,
              PHY: chain.final_stats?.PHY ?? null,
            }}
            size="xs"
          />
        )}
        {finalMode === "none" && <CardArt src={null} alt={playerName} size="xs" />}
      </div>

      <div className="text-center lg:shrink-0 lg:text-left">
        <p className="font-mono text-[10px] uppercase tracking-[.08em] text-white/35">{p.finalOvrLabel}</p>
        <p className="text-sm font-semibold text-white">{chain.final_stats?.OVR ?? "—"}</p>
      </div>

      {boosts.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 lg:justify-start">
          {boosts.map((key) => {
            const v = chain.total_boosts[key] as number;
            return <BoostChip key={key} statKey={key} value={v} />;
          })}
        </div>
      )}

      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        className="shrink-0 rounded-lg border border-white/10 bg-white/[.03] px-3 py-1.5 text-xs font-semibold text-lime hover:bg-white/[.06] lg:ml-auto"
      >
        {p.chainDetailsButton}
      </button>
    </div>
  );
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
  const { t, locale } = useI18n();
  const p = t.app.evo;

  const [query, setQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [searchError, setSearchError] = useState<ApiError | null>(null);

  const [selected, setSelected] = useState<PlayerResult | null>(null);
  const [depth, setDepth] = useState<string>("3");
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [chains, setChains] = useState<RankedChain[]>([]);
  const [applicable, setApplicable] = useState<ApplicableEvolution[]>([]);
  const [eligibleFilter, setEligibleFilterState] = useState<EligibleFilter>("all");
  const [eligibleSort, setEligibleSortState] = useState<EligibleSort>("best");
  const [eligibleSearch, setEligibleSearchState] = useState("");
  const [eligibleVisibleCount, setEligibleVisibleCount] = useState(ELIGIBLE_PAGE_SIZE);
  const [expandedEvoKey, setExpandedEvoKey] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  // "fut" (fut_rating) is the value shown to the user as "META Rating"
  // everywhere in this tool - chains must default to META Rating descending.
  const [sortMode, setSortModeState] = useState<SortMode>("fut");
  const [chainVisibleCount, setChainVisibleCount] = useState(CHAIN_PAGE_SIZE);
  const [analysisError, setAnalysisError] = useState<ApiError | null>(null);
  const [startingCardUrl, setStartingCardUrl] = useState<string | null>(null);
  const [selectedCardArtUrl, setSelectedCardArtUrl] = useState<string | null>(null);

  // Filter/sort/search all reset the "show 6 more" pagination back to page
  // one - otherwise a narrower result set could leave eligibleVisibleCount
  // pointing past the end, or a stale expanded card, from a previous view.
  function resetEligibleBrowseState() {
    setEligibleFilterState("all");
    setEligibleSortState("best");
    setEligibleSearchState("");
    setEligibleVisibleCount(ELIGIBLE_PAGE_SIZE);
    setExpandedEvoKey(null);
  }

  function setEligibleFilter(next: EligibleFilter) {
    setEligibleFilterState(next);
    setEligibleVisibleCount(ELIGIBLE_PAGE_SIZE);
  }

  function setEligibleSort(next: EligibleSort) {
    setEligibleSortState(next);
    setEligibleVisibleCount(ELIGIBLE_PAGE_SIZE);
  }

  function setEligibleSearch(value: string) {
    setEligibleSearchState(value);
    setEligibleVisibleCount(ELIGIBLE_PAGE_SIZE);
  }

  function setSortMode(next: SortMode) {
    setSortModeState(next);
    setChainVisibleCount(CHAIN_PAGE_SIZE);
  }

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearchStatus("loading");
    setSearchError(null);
    setSelected(null);
    setAnalysisStatus("idle");
    setChains([]);
    setApplicable([]);
    resetEligibleBrowseState();
    setSelectedRank(null);
    setStartingCardUrl(null);
    setSelectedCardArtUrl(null);
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
    setApplicable([]);
    resetEligibleBrowseState();
    setSelectedRank(null);
    setSortMode("fut");
    setAnalysisError(null);
    setStartingCardUrl(null);
    setSelectedCardArtUrl(null);
    void loadSelectedCardArt(card);
  }

  // Same endpoint/pattern as Price's loadCardArt() - reused deliberately,
  // not a second lookup mechanism. Failure here never blocks selection;
  // CardArt's own honest fallback covers a null url.
  async function loadSelectedCardArt(card: PlayerResult) {
    try {
      const response = await fetch(`/api/card-art/${card.resource_id}?asset_id=${card.asset_id}`, { cache: "no-store" });
      const body: unknown = await response.json().catch(() => null);
      if (isCardArtSuccess(body)) {
        setSelectedCardArtUrl(body.data.image_url);
      }
    } catch {
      // Leave selectedCardArtUrl null - CardArt renders its fallback mark.
    }
  }

  function backToResults() {
    setSelected(null);
    setAnalysisStatus("idle");
    setChains([]);
    setApplicable([]);
    resetEligibleBrowseState();
    setSelectedRank(null);
    setSortMode("fut");
    setAnalysisError(null);
    setStartingCardUrl(null);
    setSelectedCardArtUrl(null);
  }

  async function runAnalysis() {
    if (!selected) return;
    setAnalysisStatus("loading");
    setAnalysisError(null);
    setChains([]);
    setApplicable([]);
    resetEligibleBrowseState();
    setSelectedRank(null);
    setSortMode("fut");
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
        setChains(ranked);
        setApplicable(body.data.applicable ?? []);
        setSelectedRank(ranked[0]?.rank ?? null);
        setStartingCardUrl(body.data.player?.image_url ?? null);
        setAnalysisStatus(ranked.length === 0 ? "no_chains" : "success");
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

  // Only the first CHAIN_PAGE_SIZE sorted chains render by default - "Show
  // more chains" reveals the rest of the already-loaded, already-sorted list.
  const chainsVisible = sortedChains.slice(0, chainVisibleCount);
  const chainsHaveMore = chainVisibleCount < sortedChains.length;

  const eligibleFreeCount = useMemo(() => applicable.filter(isFreeEvolution).length, [applicable]);
  const eligiblePaidCount = applicable.length - eligibleFreeCount;

  // Filtering/sorting/pagination all run client-side over the single
  // already-loaded applicable[] array from this same analysis call - no
  // extra request, no second eligibility computation.
  const eligibleFilteredSorted = useMemo(() => {
    let rows = applicable;
    if (eligibleFilter === "free") rows = rows.filter(isFreeEvolution);
    else if (eligibleFilter === "paid") rows = rows.filter((e) => !isFreeEvolution(e));
    const q = eligibleSearch.trim().toLowerCase();
    if (q) rows = rows.filter((e) => e.name.toLowerCase().includes(q));
    const sorted = [...rows];
    if (eligibleSort === "ovr") sorted.sort((a, b) => (b.final_stats?.OVR ?? -1) - (a.final_stats?.OVR ?? -1));
    else if (eligibleSort === "expiry") sorted.sort((a, b) => evoExpirySortKey(a) - evoExpirySortKey(b));
    else if (eligibleSort === "cost") sorted.sort((a, b) => evoCostSortKey(a) - evoCostSortKey(b));
    else sorted.sort((a, b) => evoQualityScore(b) - evoQualityScore(a));
    return sorted;
  }, [applicable, eligibleFilter, eligibleSearch, eligibleSort]);

  // Only the currently visible slice is ever rendered (including its
  // CardArt/GeneratedEvoCard) - never all 100-200 entries at once.
  const eligibleVisible = eligibleFilteredSorted.slice(0, eligibleVisibleCount);
  const eligibleHasMore = eligibleVisibleCount < eligibleFilteredSorted.length;

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
    <>
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
      </div>

      {selected && (
        <div className="mx-auto mt-8 max-w-2xl lg:max-w-7xl">
          {/* Desktop: identity / depth+CTA / back-link reflow into one
              horizontal row via lg:contents + order-* - the mobile/tablet
              DOM and styling below stay completely untouched. */}
          <div className="glass rounded-2xl p-6 sm:p-8 lg:flex lg:flex-wrap lg:items-center lg:gap-6">
            <div className="flex items-start justify-between gap-4 lg:contents">
              <div className="flex min-w-0 items-center gap-4 lg:order-1">
                <CardArt src={selectedCardArtUrl} alt={selected.name} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-white">{selected.name}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[.1em] text-white/35">
                    {selected.position ?? "—"} · {p.ratingLabel} {selected.rating ?? "—"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={backToResults}
                className="shrink-0 text-xs font-semibold text-white/50 hover:text-white lg:order-3 lg:ml-auto"
              >
                ← {p.backToResults}
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end lg:order-2 lg:mt-0 lg:items-center">
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

            {(analysisStatus === "success" || analysisStatus === "no_chains") && (
              <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
                {/* LEFT column (desktop): best chains, reusing sortedChains/
                    selectedRank/setSortMode unchanged - only the presentation
                    (compact row + "show 3 then reveal more") is new. */}
                {analysisStatus === "success" && chains.length > 0 && (
                  <div className="glass mb-6 rounded-2xl p-6 sm:p-8 lg:mb-0">
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
                          <option value="fut">{p.sortMetaRating}</option>
                          <option value="best">{p.sortBest}</option>
                          <option value="ovr">{p.sortOvr}</option>
                          <option value="fewest">{p.sortFewest}</option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      {chainsVisible.map((rc) => (
                        <ChainRow
                          key={rc.rank}
                          chain={rc}
                          isSelected={rc.rank === selectedRank}
                          onSelect={() => setSelectedRank(rc.rank)}
                          startingCardUrl={startingCardUrl}
                          playerName={selected.name}
                          p={p}
                        />
                      ))}
                    </div>

                    {chainsHaveMore && (
                      <button
                        type="button"
                        onClick={() => setChainVisibleCount(sortedChains.length)}
                        className="mt-4 w-full rounded-xl border border-white/10 bg-white/[.02] px-4 py-2 text-xs font-semibold text-white/60 hover:bg-white/[.04]"
                      >
                        {p.chainsShowMore} ⌄
                      </button>
                    )}
                  </div>
                )}

                {/* RIGHT column (desktop): eligible evolutions - spans both
                    columns when there are no chains to show beside it. */}
                <div className={`glass mb-6 rounded-2xl p-6 sm:p-8 lg:mb-0 ${chains.length === 0 ? "lg:col-span-2" : ""}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[.12em] text-white/35">{p.eligibleHeading}</p>
                      <p className="mt-1 text-sm text-white/50">{p.eligibleSubheading}</p>
                    </div>
                    {applicable.length > 0 && (
                      <p className="shrink-0 font-mono text-[10px] uppercase tracking-[.1em] text-lime">
                        {applicable.length} {p.eligibleCompatibleLabel}
                      </p>
                    )}
                  </div>

                  {applicable.length === 0 ? (
                    <p className="mt-4 text-sm text-white/40">{p.eligibleEmptyState}</p>
                  ) : (
                    <>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {(["all", "free", "paid"] as const).map((mode) => {
                            const isActive = eligibleFilter === mode;
                            const count = mode === "all" ? applicable.length : mode === "free" ? eligibleFreeCount : eligiblePaidCount;
                            const label = mode === "all" ? p.eligibleFilterAll : mode === "free" ? p.eligibleFilterFree : p.eligibleFilterPaid;
                            return (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => setEligibleFilter(mode)}
                                aria-pressed={isActive}
                                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                  isActive ? "border-lime/40 bg-lime/[.06] text-lime" : "border-white/10 bg-white/[.02] text-white/60 hover:bg-white/[.04]"
                                }`}
                              >
                                {label} <span className="text-white/35">{count}</span>
                              </button>
                            );
                          })}
                        </div>

                        <input
                          type="text"
                          value={eligibleSearch}
                          onChange={(event) => setEligibleSearch(event.target.value)}
                          placeholder={p.eligibleSearchPlaceholder}
                          className="min-h-9 min-w-[10rem] flex-1 rounded-xl border border-white/10 bg-white/[.03] px-3 text-xs text-white placeholder:text-white/30 focus:border-lime/40 focus:outline-none"
                        />

                        <label className="sr-only" htmlFor="eligible-sort">{p.eligibleSortLabel}</label>
                        <select
                          id="eligible-sort"
                          value={eligibleSort}
                          onChange={(event) => setEligibleSort(event.target.value as EligibleSort)}
                          className="select-dark min-h-9 rounded-xl border border-white/10 bg-white/[.03] px-3 text-xs text-white focus:border-lime/40 focus:outline-none"
                        >
                          <option value="best">{p.eligibleSortBest}</option>
                          <option value="ovr">{p.eligibleSortOvr}</option>
                          <option value="expiry">{p.eligibleSortExpiry}</option>
                          <option value="cost">{p.eligibleSortCost}</option>
                        </select>
                      </div>

                      {eligibleFilteredSorted.length === 0 ? (
                        <p className="mt-4 text-sm text-white/40">{p.eligibleNoMatches}</p>
                      ) : (
                        <>
                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-col lg:gap-2">
                            {eligibleVisible.map((evo) => {
                              const key = String(evo.evolution_id ?? evo.name);
                              return (
                                <EligibleEvolutionCard
                                  key={key}
                                  evo={evo}
                                  playerName={selected.name}
                                  locale={locale}
                                  p={p}
                                  isExpanded={expandedEvoKey === key}
                                  onToggleDetails={() => setExpandedEvoKey((current) => (current === key ? null : key))}
                                />
                              );
                            })}
                          </div>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="font-mono text-[10px] uppercase tracking-[.1em] text-white/35">
                              {p.eligibleShowingPrefix} {eligibleVisible.length} {p.eligibleShowingOf} {eligibleFilteredSorted.length}{" "}
                              {p.eligibleShowingSuffix}
                            </p>
                            {eligibleHasMore && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEligibleVisibleCount((c) => c + ELIGIBLE_PAGE_SIZE)}
                                  className="rounded-xl border border-lime/30 bg-lime/[.06] px-4 py-2 text-xs font-semibold text-lime hover:bg-lime/[.1]"
                                >
                                  {p.eligibleShowMore}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEligibleVisibleCount(eligibleFilteredSorted.length)}
                                  className="rounded-xl border border-white/10 bg-white/[.02] px-4 py-2 text-xs font-semibold text-white/60 hover:bg-white/[.04]"
                                >
                                  {p.eligibleShowAll}
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
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

      <div className="mx-auto max-w-2xl">
        <p className="mt-6 text-xs leading-5 text-white/30">{p.disclaimer}</p>
      </div>
    </>
  );
}
