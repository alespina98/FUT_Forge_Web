"use client";

import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import { SparkIcon } from "@/components/icons";
import { Fc27PlayersControls } from "./players-controls";
import { PlayerCard } from "./player-card";
import type { FilterOptions, PlayerListItem } from "@/lib/fc27/players";

export function Fc27PlayersView({
  players, total, page, pageCount, baseQuery, filterOptions,
}: {
  players: PlayerListItem[];
  total: number;
  page: number;
  pageCount: number;
  baseQuery: string; // current query string, excluding "page"
  filterOptions: FilterOptions;
}) {
  const { t, locale } = useI18n();
  const p = t.fc27PlayersPage;

  const pageHref = (target: number) => {
    const params = new URLSearchParams(baseQuery);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `/fc27/players?${query}` : "/fc27/players";
  };

  return (
    <div className="hero-grid relative px-4 pb-24 pt-40 sm:px-6 sm:pt-48">
      <div className="hero-noise" /><div className="hero-orb hero-orb-primary" />
      <div className="relative mx-auto max-w-3xl text-center">
        <p className="section-label mx-auto"><SparkIcon className="size-3.5" />{p.eyebrow}</p>
        <h1 className="section-title mt-4">{p.title}</h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-white/50 sm:text-base">{p.subtitle}</p>
        <span className="fc27-count-badge mt-6">{p.badge.replace("{count}", total.toLocaleString(locale === "it" ? "it-IT" : "en-US"))}</span>
      </div>

      <div className="relative mx-auto mt-12 max-w-7xl">
        <Fc27PlayersControls t={p} filterOptions={filterOptions} />

        {players.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/15 bg-white/[.02] px-6 py-20 text-center">
            <h2 className="text-xl font-semibold">{p.noResultsTitle}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/45">{p.noResultsBody}</p>
          </div>
        ) : (
          <>
            <div className="fc27-grid">
              {players.map((player) => <PlayerCard key={player.ea_player_id} player={player} />)}
            </div>
            <div className="fc27-pagination">
              <p className="fc27-pagination-info">{p.pageOf.replace("{page}", String(page)).replace("{pageCount}", pageCount.toLocaleString())}</p>
              <div className="fc27-pagination-buttons">
                {page > 1 ? <Link href={pageHref(page - 1)} className="button-secondary !min-h-11 !px-4 text-xs">{p.previousPage}</Link> : <span className="button-secondary !min-h-11 !px-4 text-xs opacity-30">{p.previousPage}</span>}
                {page < pageCount ? <Link href={pageHref(page + 1)} className="button-primary !min-h-11 !px-4 text-xs">{p.nextPage}</Link> : <span className="button-primary !min-h-11 !px-4 text-xs opacity-30">{p.nextPage}</span>}
              </div>
            </div>
          </>
        )}
      </div>
      <section className="relative mx-auto mt-12 max-w-5xl rounded-2xl border border-white/10 bg-white/[.03] p-6 text-center"><h2 className="text-xl font-semibold">{locale === "it" ? "Esplora i giocatori EA FC 27" : "Explore EA FC 27 players"}</h2><div className="mt-4 flex flex-wrap justify-center gap-4 text-sm"><Link href="/fc27/nations">{locale === "it" ? "Giocatori per Nazione" : "Players by Nation"}</Link><Link href="/fc27/clubs">{locale === "it" ? "Giocatori per Club" : "Players by Club"}</Link><Link href="/fc27/leagues">{locale === "it" ? "Giocatori per Campionato" : "Players by League"}</Link><Link href="/fc27/rankings">{locale === "it" ? "Classifiche" : "Rankings"}</Link><Link href="/fc27/best/st">{locale === "it" ? "Migliori per ruolo" : "Best by Position"}</Link><Link href="/fc27/stat-finder">Stat Finder</Link></div></section>
    </div>
  );
}
