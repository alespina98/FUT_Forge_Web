"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "@/components/i18n-provider";
import { Arrow } from "@/components/icons";
import { Fc27BasePlayerCard } from "./fc27-base-player-card";
import type { PlayerDetail } from "@/lib/fc27/players";
import type { Dictionary } from "@/lib/copy";
import { fc27ReturnContext } from "@/lib/fc27/return-navigation";
import { track } from "@/lib/analytics/client";

type DetailCopy = Dictionary["fc27PlayerDetailPage"];
type StatKey = keyof DetailCopy["stats"];
type GroupKey = keyof DetailCopy["groups"];
type FaceKey = "pace" | "shooting" | "passing" | "dribbling" | "defending" | "physicality";

// db = the snake_case key inside PlayerDetail.detailed_attributes (see
// scripts/fc27/download-ea-ratings.ts's detailed_attributes block, the
// authoritative source for these exact field names). copy = the matching
// camelCase key in copy.ts's fc27PlayerDetailPage.stats. Every group here
// mirrors the task's fixed PACE/SHOOTING/PASSING/DRIBBLING/DEFENDING/
// PHYSICAL -> sub-attribute mapping - nothing invented beyond it.
export const ATTRIBUTE_GROUPS: Array<{ key: GroupKey; face: FaceKey; stats: Array<{ db: string; copy: StatKey }> }> = [
  { key: "pace", face: "pace", stats: [
    { db: "acceleration", copy: "acceleration" }, { db: "sprint_speed", copy: "sprintSpeed" },
  ] },
  { key: "shooting", face: "shooting", stats: [
    { db: "positioning", copy: "positioning" }, { db: "finishing", copy: "finishing" }, { db: "shot_power", copy: "shotPower" },
    { db: "long_shots", copy: "longShots" }, { db: "volleys", copy: "volleys" }, { db: "penalties", copy: "penalties" },
  ] },
  { key: "passing", face: "passing", stats: [
    { db: "vision", copy: "vision" }, { db: "crossing", copy: "crossing" }, { db: "free_kick_accuracy", copy: "freeKickAccuracy" },
    { db: "short_passing", copy: "shortPassing" }, { db: "long_passing", copy: "longPassing" }, { db: "curve", copy: "curve" },
  ] },
  { key: "dribbling", face: "dribbling", stats: [
    { db: "agility", copy: "agility" }, { db: "balance", copy: "balance" }, { db: "reactions", copy: "reactions" },
    { db: "ball_control", copy: "ballControl" }, { db: "dribbling", copy: "dribblingStat" }, { db: "composure", copy: "composure" },
  ] },
  { key: "defending", face: "defending", stats: [
    { db: "interceptions", copy: "interceptions" }, { db: "heading_accuracy", copy: "headingAccuracy" },
    { db: "defensive_awareness", copy: "defensiveAwareness" }, { db: "standing_tackle", copy: "standingTackle" }, { db: "sliding_tackle", copy: "slidingTackle" },
  ] },
  { key: "physical", face: "physicality", stats: [
    { db: "jumping", copy: "jumping" }, { db: "stamina", copy: "stamina" }, { db: "strength", copy: "strength" }, { db: "aggression", copy: "aggression" },
  ] },
];

// gk = the snake_case key inside PlayerDetail.goalkeeping (same source file,
// the goalkeeping block). Shown instead of ATTRIBUTE_GROUPS for goalkeepers
// per the task's explicit "don't force the outfield layout on GKs" rule.
export const GK_STATS: Array<{ gk: string; copy: StatKey }> = [
  { gk: "gk_diving", copy: "gkDiving" }, { gk: "gk_handling", copy: "gkHandling" }, { gk: "gk_kicking", copy: "gkKicking" },
  { gk: "gk_positioning", copy: "gkPositioning" }, { gk: "gk_reflexes", copy: "gkReflexes" },
];

function barWidth(value: number): number {
  return Math.max(0, Math.min(100, (value / 99) * 100));
}

// Positive diff = small green up arrow, negative = small red down arrow,
// zero = nothing (task's explicit diff-indicator rule). The current FC27
// launch snapshot has 0 non-zero diffs anywhere (verified via a full raw
// scan), so this renders nothing today - it is still exercised correctly
// the moment EA ships a diff.
function DiffBadge({ diff }: { diff: number }) {
  if (!diff) return null;
  const up = diff > 0;
  return (
    <span className={`fc27-diff-badge ${up ? "fc27-diff-up" : "fc27-diff-down"}`}>
      <svg viewBox="0 0 10 10" aria-hidden className="fc27-diff-arrow" style={up ? undefined : { transform: "rotate(180deg)" }}>
        <path d="M5 1.2 9 8H1l4-6.8Z" fill="currentColor" />
      </svg>
      {Math.abs(diff)}
    </span>
  );
}

function Chip({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="fc27-chip">
      <span className="fc27-chip-label">{label}</span>
      <span className="fc27-chip-value">{value}</span>
    </div>
  );
}

export function Fc27PlayerDetailView({ player, baseMetaRating, returnTo, entityLinks }: { player: PlayerDetail; baseMetaRating: number | null; returnTo: string; entityLinks: { nation: string | null; club: string | null; league: string | null } }) {
  const { t, locale } = useI18n();
  const p: DetailCopy = t.fc27PlayerDetailPage;
  const isGK = player.position_short_label === "GK";
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per rendered player, not on every copy/locale change
  useEffect(() => { track("player_view", { ea_player_id: player.ea_player_id, position: player.position_short_label }); }, [player.ea_player_id]);
  const returnContext = fc27ReturnContext(returnTo);
  const positionName = returnContext.position ? t.fc27BestPage.positions[returnContext.position as keyof typeof t.fc27BestPage.positions] : undefined;
  const backLabel = returnContext.kind === "hiddenGems" ? (locale === "it" ? `Torna alle ${t.nav.fc27HiddenGems}` : `Back to ${t.nav.fc27HiddenGems}`)
    : returnContext.kind === "squadBuilder" ? (locale === "it" ? "Torna allo Squad Builder" : "Back to Squad Builder")
    : returnContext.kind === "statFinder" ? (locale === "it" ? `Torna alla ${t.nav.fc27StatFinder}` : `Back to ${t.nav.fc27StatFinder}`)
    : returnContext.kind === "rankings" ? (locale === "it" ? `Torna alle ${t.nav.fc27Rankings}` : `Back to ${t.nav.fc27Rankings}`)
    : returnContext.kind === "similar" ? (locale === "it" ? "Torna ai giocatori simili" : "Back to Similar Players")
    : returnContext.kind === "best" && positionName ? (locale === "it" ? `Torna ai migliori ${positionName}` : `Back to Best ${positionName}`)
    : p.backToPlayers;

  const dobDate = new Date(player.birthdate);
  const dob = Number.isNaN(dobDate.getTime())
    ? player.birthdate
    : dobDate.toLocaleDateString(locale === "it" ? "it-IT" : "en-US", { year: "numeric", month: "long", day: "numeric" });

  const footLabel = player.preferred_foot_code === 1 ? p.footRight : player.preferred_foot_code === 2 ? p.footLeft : String(player.preferred_foot_code);
  const altPositions = player.alternate_positions.length > 0 ? player.alternate_positions.map((ap) => ap.short_label).join(", ") : "—";

  return (
    <div className="hero-grid relative overflow-hidden px-4 pb-24 pt-40 sm:px-6 sm:pt-48">
      <div className="hero-noise" /><div className="hero-orb hero-orb-primary" />
      <div className="relative mx-auto max-w-6xl">
        <Link href={returnTo} className="fc27-back-link">
          <Arrow className="size-4 rotate-180" />
          {backLabel}
        </Link>

        <div className="fc27-detail-top mt-8">
          <Fc27BasePlayerCard
            eaPlayerId={player.ea_player_id}
            overall={player.overall}
            position={player.position_short_label}
            playerName={player.display_name}
            commonName={player.common_name}
            avatarUrl={player.avatar_url}
            nationalityImageUrl={player.nationality_image_url}
            nationalityName={player.nationality_name}
            clubImageUrl={player.club_image_url}
            clubName={player.club_name}
            pace={player.pace}
            shooting={player.shooting}
            passing={player.passing}
            dribbling={player.dribbling}
            defending={player.defending}
            physicality={player.physicality}
            isGoalkeeper={isGK}
            alternatePosition={player.alternate_positions[0]?.short_label ?? null}
            preferredFootCode={player.preferred_foot_code}
            skillMoves={player.skill_moves_raw}
            weakFoot={player.weak_foot}
            size="detail"
          />

          <div>
            <p className="section-label">{p.playerDetails}</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{player.display_name}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/50">
              <span>{player.position_label}</span>
              {player.club_name ? (<><span aria-hidden>·</span><span>{player.club_name}</span></>) : null}
              <span aria-hidden>·</span>
              <span>{player.nationality_name}</span>
            </p>

            <Link href={`/fc27/similar/${player.ea_player_id}-${player.slug.replace(new RegExp(`-${player.ea_player_id}$`), "")}`} className="fc27-detail-similar-cta">
              {locale === "it" ? "Trova Giocatori Simili" : "Find Similar Players"}
              <Arrow className="size-4" />
            </Link>
            <Link href={`/fc27/compare?a=${player.ea_player_id}`} className="fc27-detail-compare-cta">
              {p.compareAction}
              <Arrow className="size-4" />
            </Link>
            <Link href={`/fc27/best/${player.position_short_label.toLowerCase()}`} className="fc27-detail-best-position-link">
              {p.bestPositionAction.replace("{code}", player.position_short_label)}
            </Link>

            {/* skill_moves_raw can exceed 5 (e.g. Mbappe stores 6) while EA's
                own live ratings page still renders a 5-star max for that
                same player - verified directly against ea.com - so display
                clamps to 5 without altering the stored raw value. */}
            <div className="fc27-chip-grid mt-8">
              {baseMetaRating != null ? <div className="fc27-base-meta-detail"><span>{locale === "it" ? "Meta Rating Base" : "Base Meta Rating"}</span><strong>{baseMetaRating.toFixed(1)}</strong><p>{locale === "it" ? "Calcolato con il motore Meta Rating di FUT Forge utilizzando i dati FC27 attualmente disponibili. PlayStyles, Ruoli e AcceleRATE saranno inclusi quando EA li renderà disponibili." : "Calculated with FUT Forge’s Meta Rating engine using the FC27 data currently available. PlayStyles, Roles and AcceleRATE will be included when EA makes them available."}</p></div> : null}
              <Chip label={p.overall} value={player.overall} />
              <Chip label={p.position} value={player.position_label} />
              <Chip label={p.alternatePositions} value={altPositions} />
              <Chip label={p.club} value={entityLinks.club && player.club_name ? <Link href={entityLinks.club}>{player.club_name}</Link> : player.club_name ?? "—"} />
              <Chip label={p.league} value={entityLinks.league && player.league_name ? <Link href={entityLinks.league}>{player.league_name}</Link> : player.league_name ?? "—"} />
              <Chip label={p.nation} value={entityLinks.nation ? <Link href={entityLinks.nation}>{player.nationality_name}</Link> : player.nationality_name} />
              <Chip label={p.dateOfBirth} value={dob} />
              <Chip label={p.preferredFoot} value={footLabel} />
              <Chip label={p.skillMoves} value={`${Math.min(player.skill_moves_raw, 5)}/5`} />
              <Chip label={p.weakFoot} value={`${Math.min(player.weak_foot, 5)}/5`} />
            </div>
          </div>
        </div>

        {isGK ? (
          <section className="mt-14">
            <h2 className="text-xl font-semibold">{p.goalkeeping}</h2>
            <div className="fc27-attr-groups mt-6 fc27-attr-groups-gk">
              <div className="fc27-attr-group">
                <div className="fc27-attr-rows">
                  {GK_STATS.map(({ gk, copy }) => {
                    const sv = player.goalkeeping[gk];
                    if (!sv) return null;
                    return (
                      <div key={gk} className="fc27-attr-row">
                        <span className="fc27-attr-row-label">{p.stats[copy]}</span>
                        <div className="fc27-attr-bar"><div className="fc27-attr-bar-fill" style={{ width: `${barWidth(sv.value)}%` }} /></div>
                        <span className="fc27-attr-row-value">{sv.value}</span>
                        <DiffBadge diff={sv.diff} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-14">
            <h2 className="text-xl font-semibold">{p.attributesTitle}</h2>
            <div className="fc27-attr-groups mt-6">
              {ATTRIBUTE_GROUPS.map((group) => {
                const faceValue = player[group.face];
                const faceDiff = player.face_stat_diffs[group.face] ?? 0;
                return (
                  <div key={group.key} className="fc27-attr-group">
                    <div className="fc27-attr-group-head">
                      <span className="fc27-attr-group-name">{p.groups[group.key]}</span>
                      <span className="fc27-attr-group-face">
                        {faceValue ?? "—"}
                        <DiffBadge diff={faceDiff} />
                      </span>
                    </div>
                    <div className="fc27-attr-rows">
                      {group.stats.map((stat) => {
                        const sv = player.detailed_attributes[stat.db];
                        if (!sv) return null;
                        return (
                          <div key={stat.db} className="fc27-attr-row">
                            <span className="fc27-attr-row-label">{p.stats[stat.copy]}</span>
                            <div className="fc27-attr-bar"><div className="fc27-attr-bar-fill" style={{ width: `${barWidth(sv.value)}%` }} /></div>
                            <span className="fc27-attr-row-value">{sv.value}</span>
                            <DiffBadge diff={sv.diff} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
