"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "../i18n-provider";
import { CardArt } from "./card-art";
import { Arrow } from "../icons";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type ClubItem = {
  instance_id: number;
  resource_id: number;
  asset_id: number;
  rating: number;
  rarity_id: number;
  version: string;
  name: string;
  untradeable: boolean;
  last_sale_price: number;
};
type ClubSuccessEnvelope = { ok: true; data: { synced_at: string | null; item_count: number; items: ClubItem[] } };
type CardArtSuccessEnvelope = { ok: true; data: { resource_id: number; image_url: string | null } };
type BackendErrorEnvelope = { ok: false; error: { code: string; message: string } };

type Status = "loading" | "unauthenticated" | "loaded" | "error";
type Filter = "all" | "tradeable" | "untradeable";
type Sort = "rating" | "name";

const PAGE_SIZE = 24;

function isClubSuccess(value: unknown): value is ClubSuccessEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { ok?: unknown; data?: unknown };
  return v.ok === true && typeof v.data === "object" && v.data !== null && Array.isArray((v.data as { items?: unknown }).items);
}

function isCardArtSuccess(value: unknown): value is CardArtSuccessEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { ok?: unknown; data?: unknown };
  return v.ok === true && typeof v.data === "object" && v.data !== null && "image_url" in (v.data as object);
}

function isBackendError(value: unknown): value is BackendErrorEnvelope {
  return typeof value === "object" && value !== null && (value as { ok?: unknown }).ok === false;
}

// Same artwork resolution as before (unmodified): fetch by resource_id/asset_id
// from the existing /api/card-art endpoint, render via the existing CardArt
// component. Only the requested `size` changed, to make artwork the visual
// focus of the redesigned grid.
function ClubCardArt({ item }: { item: ClubItem }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!item.resource_id) return;
    fetch(`/api/card-art/${item.resource_id}?asset_id=${item.asset_id || item.resource_id}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((body: unknown) => {
        if (!cancelled && isCardArtSuccess(body)) setUrl(body.data.image_url);
      })
      .catch(() => {
        // Leave url null - CardArt renders its fallback mark.
      });
    return () => {
      cancelled = true;
    };
  }, [item.resource_id, item.asset_id]);

  return <CardArt src={url} alt={item.name} size="xl" />;
}

function ExitIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M8 4H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M12.5 13l3-3-3-3M15 10H7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CardsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 8h12" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function RatingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M3 13.5 7.5 9l3 3L17 5.5M17 5.5h-4M17 5.5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="m17 17-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  async function handleClick() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.refresh();
  }
  return (
    <button type="button" onClick={handleClick} className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white">
      {label}
      <ExitIcon className="h-3.5 w-3.5" />
    </button>
  );
}

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="glass flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3">
      <span className="shrink-0 text-lime/70">{icon}</span>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-lg font-semibold text-white">{value}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-white/40">{label}</span>
      </div>
    </div>
  );
}

export function ClubTool() {
  const { t, locale } = useI18n();
  const c = t.app.club;

  const [status, setStatus] = useState<Status>("loading");
  const [items, setItems] = useState<ClubItem[]>([]);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("rating");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/club", { cache: "no-store" });
        if (response.status === 401) {
          if (!cancelled) setStatus("unauthenticated");
          return;
        }
        const body: unknown = await response.json().catch(() => null);
        if (cancelled) return;
        if (isClubSuccess(body)) {
          setItems(body.data.items);
          setSyncedAt(body.data.synced_at);
          setItemCount(body.data.item_count);
          setStatus("loaded");
          return;
        }
        setErrorMessage(isBackendError(body) ? body.error.message : c.genericError);
        setStatus("error");
      } catch {
        if (!cancelled) {
          setErrorMessage(c.networkError);
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only ever runs once per mount - re-fetching on every copy-object
    // change would refetch on every locale toggle for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (filter === "tradeable") list = list.filter((item) => !item.untradeable);
    else if (filter === "untradeable") list = list.filter((item) => item.untradeable);
    if (q) list = list.filter((item) => item.name.toLowerCase().includes(q));
    const sorted = [...list].sort((a, b) => (sort === "rating" ? b.rating - a.rating : a.name.localeCompare(b.name)));
    return sorted;
  }, [items, filter, query, sort]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Derived purely from data already in hand - no new fetch, no invented value.
  const maxRating = useMemo(() => items.reduce((max, item) => Math.max(max, item.rating || 0), 0), [items]);

  const compactDayMonth = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-US", { day: "2-digit", month: "short" });
  const compactTime = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-US", { hour: "2-digit", minute: "2-digit" });
  const compactSyncedAt = syncedAt ? `${compactDayMonth.format(new Date(syncedAt)).replace(".", "").toUpperCase()} • ${compactTime.format(new Date(syncedAt))}` : c.neverSynced;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-label">{c.eyebrow}</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">{c.title}</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/50">{c.lead}</p>
        </div>
        {status === "loaded" && <LogoutButton label={t.auth.logoutButton} />}
      </div>

      {status === "loading" && (
        <p className="mt-8 text-sm text-white/40" role="status">
          …
        </p>
      )}

      {status === "unauthenticated" && (
        <div className="glass mt-8 rounded-2xl p-6 text-center sm:p-10">
          <p className="text-sm text-white/60">{c.loginPrompt}</p>
          <Link href="/login?next=/app/club" className="button-primary mt-5 inline-block">
            {c.loginButton}
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="mt-8 rounded-xl border border-red-500/25 bg-red-500/[.06] p-4" role="alert">
          <p className="text-sm font-semibold text-red-300">{c.errorTitle}</p>
          <p className="mt-1 text-sm text-white/60">{errorMessage}</p>
        </div>
      )}

      {status === "loaded" && itemCount === 0 && (
        <div className="glass mt-8 rounded-2xl p-6 sm:p-10">
          <p className="text-lg font-semibold text-white">{c.emptyTitle}</p>
          <p className="mt-2 text-sm text-white/50">{c.emptyBody}</p>
          <ol className="mt-5 flex flex-col gap-2">
            {c.emptySteps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm text-white/60">
                <span className="font-mono text-xs text-lime/70">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {status === "loaded" && itemCount > 0 && (
        <>
          {/* Compact stat strip. Only real/derived values are shown - a 4th
              tile (e.g. EVO-compatible count) can be dropped in later by
              adding one more <StatTile> and widening this grid to 4 columns;
              no layout rework needed. */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <StatTile icon={<CardsIcon className="h-4 w-4" />} value={String(itemCount)} label={c.statCardsLabel} />
            <StatTile icon={<RatingIcon className="h-4 w-4" />} value={String(maxRating)} label={c.statMaxRatingLabel} />
            <StatTile icon={<ClockIcon className="h-4 w-4" />} value={compactSyncedAt} label={c.statLastSyncLabel} />
          </div>

          <div className="glass mt-4 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder={c.searchPlaceholder}
                className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[.03] py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-lime/40 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value as Filter);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="min-h-11 rounded-xl border border-white/10 bg-white/[.03] px-3 text-xs text-white focus:border-lime/40 focus:outline-none"
              >
                <option value="all">{c.filterAll}</option>
                <option value="tradeable">{c.filterTradeable}</option>
                <option value="untradeable">{c.filterUntradeable}</option>
              </select>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                className="min-h-11 rounded-xl border border-white/10 bg-white/[.03] px-3 text-xs text-white focus:border-lime/40 focus:outline-none"
              >
                <option value="rating">{c.sortRating}</option>
                <option value="name">{c.sortName}</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-8 text-sm text-white/40">{c.noMatches}</p>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((item) => (
                  <div
                    key={item.instance_id}
                    className="group glass flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-white/10 p-4 text-center transition duration-200 hover:-translate-y-0.5 hover:border-lime/40"
                  >
                    <ClubCardArt item={item} />
                    <div className="flex w-full items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-left text-xl font-bold text-white">{item.name || c.unknownName}</p>
                      <Arrow className="h-4 w-4 shrink-0 -translate-x-1 text-white/0 transition duration-200 group-hover:translate-x-0 group-hover:text-lime" />
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-6 flex justify-center gap-3">
                  <button type="button" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)} className="button-primary">
                    {c.showMore}
                  </button>
                  <button type="button" onClick={() => setVisibleCount(filtered.length)} className="text-xs font-semibold text-white/50 hover:text-white">
                    {c.showAll}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
