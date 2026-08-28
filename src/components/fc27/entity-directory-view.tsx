"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/i18n-provider";
import type { EntityKind, Fc27Entity } from "@/lib/fc27/entities";

const words = {
  en: {
    nations: "Players by Nation", clubs: "Players by Club", leagues: "Players by League",
    intro: "Browse indexable EA FC 27 player collections, ordered by player count.", search: "Search directory", players: "players",
    squadLink: { nations: "Build a national squad", clubs: "Build a squad with players from your club", leagues: "Build a squad from this league" },
  },
  it: {
    nations: "Giocatori per Nazione", clubs: "Giocatori per Club", leagues: "Giocatori per Campionato",
    intro: "Esplora le raccolte indicizzabili di giocatori EA FC 27, ordinate per numero di giocatori.", search: "Cerca nella directory", players: "giocatori",
    squadLink: { nations: "Crea una squadra nazionale", clubs: "Crea una squadra con i giocatori del tuo club", leagues: "Crea una squadra da questo campionato" },
  },
};

export function EntityDirectoryView({ kind, entities }: { kind: EntityKind; entities: Fc27Entity[] }) {
  const { locale } = useI18n(); const c = words[locale]; const [query, setQuery] = useState("");
  const visible = useMemo(() => entities.filter((entity) => entity.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [entities, query]);
  return <main className="hero-grid relative min-h-screen overflow-hidden px-4 pb-24 pt-36 sm:px-6 sm:pt-40"><div className="hero-noise"/><div className="hero-orb hero-orb-primary"/><div className="relative mx-auto max-w-6xl">
    <p className="section-label">EA FC 27</p><h1 className="mt-3 text-4xl font-bold sm:text-5xl">{c[kind]}</h1><p className="mt-4 max-w-2xl text-white/55">{c.intro}</p>
    <Link href="/fc27/squad-builder" className="mt-3 inline-block text-sm font-semibold text-lime">{c.squadLink[kind]} →</Link>
    <label className="mt-8 block max-w-xl"><span className="mb-2 block text-sm font-semibold text-white/75">{c.search}</span><input className="min-h-12 w-full rounded-xl border border-white/15 bg-black/30 px-4 text-white outline-none focus:border-lime" value={query} onChange={(event)=>setQuery(event.target.value)} type="search"/></label>
    <p className="mt-4 text-sm text-white/45" aria-live="polite">{visible.length} / {entities.length}</p>
    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={c[kind]}>{visible.map(entity=><Link key={entity.slug} href={`/fc27/${kind}/${entity.slug}`} className="rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:border-lime/45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime"><strong className="block text-white">{entity.name}</strong><span className="mt-1 block text-sm text-white/45">{entity.count.toLocaleString()} {c.players}</span></Link>)}</section>
  </div></main>;
}
