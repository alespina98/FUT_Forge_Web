import Link from "next/link";

// Plain server component (no "use client") on purpose: this content must be present in the
// initial HTML for Googlebot and any non-JS fetch, not depend on hydration. Every claim below
// describes a real, currently-shipped feature of Fc27SquadBuilderView/AutoBuildPanel/
// calculateSquadChemistry - nothing here promises a feature that doesn't exist yet (there is no
// account-based save, no export into the game, and Auto Build's budget mode is explicitly not
// live - EA FC 27's transfer market isn't open).

// Exported so page.tsx can build the FAQPage JSON-LD node from this exact same array - the
// structured data can never drift from what's actually visible on the page.
export const squadBuilderFaqs: Array<{ q: string; a: string }> = [
  {
    q: "Is the EA FC 27 Squad Builder free?",
    a: "Yes. The Squad Builder is free to use directly in your browser, with no account, sign-up or download required. Auto Builder, chemistry calculation and squad sharing are all included.",
  },
  {
    q: "Is my squad saved automatically?",
    a: "Yes - your formation and player selections are saved to your browser automatically as you build, so reopening this page later restores your last squad on the same device.",
  },
  {
    q: "Can I create a squad without EA FC 27 Ultimate Team coins or a market?",
    a: "Yes. The Squad Builder works entirely from the FC 27 player database, independent of your own club or the transfer market, so you can plan a squad before deciding what to buy.",
  },
  {
    q: "How is chemistry calculated?",
    a: "Each in-position player earns chemistry points from shared club, nation and league links with the rest of the squad (0-3 per player, 33 maximum). An out-of-position player contributes 0 regardless of links. See “How Chemistry Is Calculated” above for the exact thresholds.",
  },
  {
    q: "What does Auto Builder generate the squad from?",
    a: "Auto Builder fills every slot in your chosen formation using filters you set - league, nation, club, minimum/maximum overall, minimum Base Meta rating, and a priority of Meta, Balanced or Chemistry. Budget-based generation is listed but not yet available, since EA FC 27's in-game market hasn't opened.",
  },
  {
    q: "Is the Squad Builder available in Italian?",
    a: "Sì. Switch the site language from the navigation menu (EN/IT) to use the Squad Builder, Auto Builder and player database in Italian.",
  },
  {
    q: "How do I share a squad I built?",
    a: "Select “Share Squad” to copy a link that encodes your formation and every selected player. Anyone who opens that link sees the exact same squad rebuilt automatically - no account needed on either side.",
  },
];

export function Fc27SquadBuilderContent() {
  return (
    <section className="fc27-squad-content relative mx-auto max-w-[1440px] px-3 pb-8 sm:px-6" aria-labelledby="squad-builder-guide">
      <h2 id="squad-builder-guide" className="sr-only">EA FC 27 Squad Builder guide</h2>

      <div className="fc27-content-grid mt-10 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
          <h2 className="text-xl font-bold">Create Your EA FC 27 Squad</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">
            The FUT Forge Squad Builder lets you assemble a full EA FC 27 starting XI directly in your browser -
            free, with no account and no download. Choose a formation, fill each slot from the complete FC 27
            player database, and your average overall and chemistry update as you go. It works independently of
            your own club or the transfer market, so you can plan a squad before deciding who to actually buy.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
          <h2 className="text-xl font-bold">How the Squad Builder Works</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">
            Pick one of 13 supported formations, then select an empty slot on the pitch to search the player
            database by name. Results are filtered to that slot&apos;s position and flagged as Compatible or Out of
            Position based on each player&apos;s primary and alternate positions, so you always know before you
            commit a slot.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
          <h2 className="text-xl font-bold">Auto Builder: Generate Your Starting XI Automatically</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">
            Prefer not to fill every slot by hand? Auto Builder fills your whole formation at once from filters you
            set - league, nation, club, minimum and maximum overall, minimum Base Meta rating, and a priority of
            Meta, Balanced or Chemistry. Not happy with the result? Regenerate instantly with the same filters.
            Budget-based generation is on the roadmap but not live yet, since EA FC 27&apos;s in-game transfer market
            hasn&apos;t opened.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
          <h2 className="text-xl font-bold">How Chemistry Is Calculated</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">
            Every in-position player earns 0-3 chemistry points from shared club, nation and league links with the
            rest of the squad: club links need 2/4/7 players for 1/2/3 points, nation links need 2/5/8, and league
            links need 3/5/8. A player in the wrong position always contributes 0, regardless of links. Squad
            chemistry is the sum of every player&apos;s points, out of a maximum of 33.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
          <h2 className="text-xl font-bold">Formations, Roles and Positions</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">
            13 formations are supported, from balanced shapes like 4-3-3 and 4-2-3-1 to attacking and defensive
            variants such as 4-3-2-1, 3-4-2-1 and 5-2-1-2. Switching formation resets the pitch, since slot
            positions change - a confirmation prompt appears if you already have players placed, so you never lose
            a squad by accident.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
          <h2 className="text-xl font-bold">Complete EA FC 27 Player Database</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">
            Every slot searches the same database behind FUT Forge&apos;s{" "}
            <Link href="/fc27/players" className="text-lime">EA FC 27 player database</Link> - over 20,000 players
            with real ratings, positions, clubs, nations and leagues. Want to research a pick before adding it?
            Open the full profile, or{" "}
            <Link href="/fc27/compare" className="text-lime">compare two players side by side</Link> first.
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[.03] p-6 lg:col-span-2">
          <h2 className="text-xl font-bold">Save and Share Your Squad</h2>
          <p className="mt-3 text-sm leading-6 text-white/55">
            Your formation and selections save automatically to your browser as you build, so returning to this
            page later restores your last squad on the same device. To share a squad, select &quot;Share Squad&quot;
            to copy a link that encodes your exact formation and players - anyone who opens it sees the same squad
            rebuilt automatically, no account required on either side.
          </p>
        </article>
      </div>

      <nav className="fc27-squad-explore mt-8 rounded-2xl border border-white/10 bg-black/20 p-6" aria-label="More FC 27 tools">
        <h2 className="text-lg font-semibold">More FC 27 Tools</h2>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href="/fc27/players" className="text-lime">Browse the Player Database</Link>
          <Link href="/fc27/compare" className="text-lime">Compare Players</Link>
          <Link href="/fc27/rankings" className="text-lime">EA FC 27 Rankings</Link>
          <Link href="/fc27/stat-finder" className="text-lime">Search Players by Custom Stats</Link>
        </div>
      </nav>

      <div className="dl-help-section mt-10 max-w-3xl">
        <p className="section-label">FAQ</p>
        <h2 className="mt-2 text-xl font-bold">Squad Builder FAQ</h2>
        <div className="dl-help-list mt-4">
          {squadBuilderFaqs.map(({ q, a }) => (
            <details key={q}>
              <summary>{q}<span aria-hidden>+</span></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
