"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "../i18n-provider";
import { CardArt } from "./card-art";

type PlayerResult = { resource_id: number; name: string; rating: number | null; position: string | null; image_url: string | null };
type SearchSuccessEnvelope = { ok: true; data: { query: string; results: PlayerResult[] } };
type PriceSuccessEnvelope = { ok: true; data: { resource_id: number; price: number; manifestVersion: number; cached: boolean } };
type BackendErrorEnvelope = { ok: false; error: { code: string; message: string } };
type ApiError = { code: string; message: string };

type SearchStatus = "idle" | "loading" | "success" | "error";
type PriceStatus = "idle" | "loading" | "success" | "not_found" | "error";

function isSearchSuccess(value: unknown): value is SearchSuccessEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { ok?: unknown; data?: unknown };
  return v.ok === true && typeof v.data === "object" && v.data !== null && Array.isArray((v.data as { results?: unknown }).results);
}

function isPriceSuccess(value: unknown): value is PriceSuccessEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { ok?: unknown; data?: unknown };
  return v.ok === true && typeof v.data === "object" && v.data !== null && typeof (v.data as { price?: unknown }).price === "number";
}

function isBackendError(value: unknown): value is BackendErrorEnvelope {
  return typeof value === "object" && value !== null && (value as { ok?: unknown }).ok === false;
}

function ErrorPanel({ title, message, code }: { title: string; message: string; code: string }) {
  return (
    <div className="rounded-xl border border-red-500/25 bg-red-500/[.06] p-4" role="alert">
      <p className="text-sm font-semibold text-red-300">{title}</p>
      <p className="mt-1 text-sm text-white/60">{message}</p>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-[.12em] text-white/30">{code}</p>
    </div>
  );
}

export function PriceTool() {
  const { t, locale } = useI18n();
  const p = t.app.price;

  const [query, setQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [searchError, setSearchError] = useState<ApiError | null>(null);

  const [selected, setSelected] = useState<PlayerResult | null>(null);
  const [priceStatus, setPriceStatus] = useState<PriceStatus>("idle");
  const [price, setPrice] = useState<PriceSuccessEnvelope["data"] | null>(null);
  const [priceError, setPriceError] = useState<ApiError | null>(null);

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearchStatus("loading");
    setSearchError(null);
    setSelected(null);
    setPriceStatus("idle");
    try {
      const response = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const body: unknown = await response.json().catch(() => null);
      if (isSearchSuccess(body)) {
        setResults(body.data.results);
        setSearchStatus("success");
        return;
      }
      // Never surface raw upstream/error text to the user - only the stable
      // error code, paired with our own neutral, translated copy.
      setSearchError({ code: isBackendError(body) ? body.error.code : "unexpected_response", message: p.genericError });
      setSearchStatus("error");
    } catch {
      setSearchError({ code: "network_error", message: p.networkError });
      setSearchStatus("error");
    }
  }

  async function selectCard(card: PlayerResult) {
    setSelected(card);
    setPriceStatus("loading");
    setPriceError(null);
    setPrice(null);
    try {
      const response = await fetch(`/api/price/${card.resource_id}`, { cache: "no-store" });
      const body: unknown = await response.json().catch(() => null);
      if (response.status === 404 && isBackendError(body) && body.error.code === "price_not_found") {
        setPriceStatus("not_found");
        return;
      }
      if (isPriceSuccess(body)) {
        setPrice(body.data);
        setPriceStatus("success");
        return;
      }
      setPriceError({ code: isBackendError(body) ? body.error.code : "unexpected_response", message: p.genericError });
      setPriceStatus("error");
    } catch {
      setPriceError({ code: "network_error", message: p.networkError });
      setPriceStatus("error");
    }
  }

  function backToResults() {
    setSelected(null);
    setPriceStatus("idle");
    setPrice(null);
    setPriceError(null);
  }

  const numberFormat = new Intl.NumberFormat(locale === "it" ? "it-IT" : "en-US");

  return (
    <div className="mx-auto max-w-2xl">
      <p className="section-label">{p.eyebrow}</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">{p.title}</h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-white/50">{p.lead}</p>

      <form onSubmit={runSearch} className="glass mt-8 flex flex-col gap-3 rounded-2xl p-6 sm:flex-row sm:items-center sm:p-8">
        <label className="sr-only" htmlFor="price-search">{p.searchLabel}</label>
        <input
          id="price-search"
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

        {searchStatus === "success" && !selected && (
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

        {selected && (
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

            <div className="mt-5 flex justify-center">
              <CardArt src={selected.image_url} alt={selected.name} size="lg" />
            </div>

            <div className="mt-5">
              {priceStatus === "loading" && (
                <p className="text-center text-sm text-white/50" role="status">{p.priceLoading}</p>
              )}

              {priceStatus === "not_found" && <p className="text-center text-sm text-white/40">{p.priceNotFound}</p>}

              {priceStatus === "error" && priceError && (
                <ErrorPanel title={p.priceErrorTitle} message={priceError.message} code={priceError.code} />
              )}

              {priceStatus === "success" && price && (
                <div className="text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[.12em] text-white/35">{p.priceValueLabel}</p>
                  <p className="mt-1 text-3xl font-semibold text-lime">
                    {numberFormat.format(price.price)} <span className="text-sm font-normal text-white/40">{p.coinsSuffix}</span>
                  </p>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[.1em] text-white/30">
                    {p.cachedLabel}: {price.cached ? p.yes : p.no}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs leading-5 text-white/30">{p.disclaimer}</p>
    </div>
  );
}
