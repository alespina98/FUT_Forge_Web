"use client";

import { useState } from "react";
import Image from "next/image";
import { PlayerPortrait } from "./player-portrait";
import { cardTierForOverall, CARD_TIER_FRAME, CARD_TIER_DIMENSIONS } from "@/lib/fc27/card-tier";

// EA's own FC27 goalkeeper item cards reuse the same 6 face-stat slots as
// outfield cards but relabel them DIV/HAN/KIC/REF/SPD/POS - verified
// against our own data in Step 5C (Courtois: pace=87 matches his
// gk_diving=87, shooting=89 matches gk_handling=89, passing=78 matches
// gk_kicking=78, dribbling=90 matches gk_reflexes=90, physicality=90
// matches gk_positioning=90; the "defending" slot holds his GK speed
// rating, which has no separate stored field). No new data needed - only
// the label changes for goalkeepers.
const OUTFIELD_LABELS = { pace: "PAC", shooting: "SHO", passing: "PAS", dribbling: "DRI", defending: "DEF", physicality: "PHY" } as const;
const GK_LABELS = { pace: "DIV", shooting: "HAN", passing: "KIC", dribbling: "REF", defending: "SPD", physicality: "POS" } as const;
const STAT_ORDER = ["pace", "shooting", "passing", "dribbling", "defending", "physicality"] as const;

// Small decorative crest/flag - hides itself on load failure instead of a
// broken-image icon. Never mirrored: rendered directly from the stored
// nationality_image_url/club_image_url.
function CardIcon({ src, alt, className }: { src: string | null; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  // eslint-disable-next-line @next/next/no-img-element -- small external crest/flag, not worth next/image's remote-domain allowlist.
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />;
}

export type Fc27BasePlayerCardProps = {
  eaPlayerId: number;
  overall: number;
  position: string;
  playerName: string;
  commonName?: string | null;
  avatarUrl: string | null;
  nationalityImageUrl: string | null;
  nationalityName?: string;
  clubImageUrl: string | null;
  clubName?: string | null;
  pace: number | null;
  shooting: number | null;
  passing: number | null;
  dribbling: number | null;
  defending: number | null;
  physicality: number | null;
  isGoalkeeper: boolean;
  alternatePosition?: string | null;
  preferredFootCode?: number | null;
  skillMoves?: number | null;
  weakFoot?: number | null;
  baseMeta?: number | null;
  size?: "grid" | "detail";
  className?: string;
};

type StatKeyName = (typeof STAT_ORDER)[number];

// Single reusable FC27 base-card presentation, rendered on top of one of
// the 3 user-approved Bronze/Silver/Gold frame images (public/fc27/cards -
// Step 5D). Internal layout is proportioned in percentages of the card's
// own rendered height/width (flexbox + cqw), so the exact same markup/CSS
// produces a small grid tile or a large detail card, and adapts correctly
// even though the silver frame's canvas ratio differs slightly from
// bronze/gold - no separate visual implementation to maintain per size.
export function Fc27BasePlayerCard({
  eaPlayerId, overall, position, playerName, commonName, avatarUrl,
  nationalityImageUrl, nationalityName = "", clubImageUrl, clubName,
  pace, shooting, passing, dribbling, defending, physicality,
  isGoalkeeper, alternatePosition, preferredFootCode, skillMoves, weakFoot, baseMeta,
  size = "grid", className = "",
}: Fc27BasePlayerCardProps) {
  const tier = cardTierForOverall(overall);
  const dims = CARD_TIER_DIMENSIONS[tier];
  const labels = isGoalkeeper ? GK_LABELS : OUTFIELD_LABELS;
  const values: Record<StatKeyName, number | null> = { pace, shooting, passing, dribbling, defending, physicality };
  const nameOnCard = commonName?.trim() || playerName;

  // Matches the same 1/2 code -> Right/Left convention already used on the
  // detail page (see player-detail-view.tsx) - no authoritative EA enum
  // mapping exists beyond that, so a third value just shows nothing rather
  // than guessing a label.
  const footLabel = preferredFootCode === 1 ? "R" : preferredFootCode === 2 ? "L" : null;
  // skill_moves_raw can exceed 5 (e.g. Mbappe stores 6) while EA's own
  // ratings page still renders a 5-star max for that same player (verified
  // in Step 5B) - clamped the same way here as the detail page's chips.
  const skillWeak = skillMoves != null && weakFoot != null ? `${Math.min(skillMoves, 5)}•${Math.min(weakFoot, 5)}` : null;

  return (
    <div className={`fc27-base-card fc27-base-card-${size} fc27-base-card-tier-${tier} ${className}`} data-player-id={eaPlayerId}>
      <div className="fc27-base-card-frame" style={{ aspectRatio: `${dims.width} / ${dims.height}` }}>
        <Image
          src={CARD_TIER_FRAME[tier]}
          alt=""
          fill
          sizes={size === "detail" ? "300px" : "(max-width: 640px) 45vw, (max-width: 1200px) 20vw, 16vw"}
          style={{ objectFit: "cover" }}
          className="fc27-base-card-frame-bg"
          priority={false}
        />
        <div className="fc27-base-card-content">
          <div className="fc27-base-card-rating-block">
            <span className="fc27-base-card-rating">{overall}</span>
            <span className="fc27-base-card-position">{position}</span>
          </div>

          <div className="fc27-base-card-portrait-zone">
            <PlayerPortrait src={avatarUrl} alt={playerName} overall={overall} fit="contain" className="fc27-base-card-portrait" />
          </div>

          <p className="fc27-base-card-nameplate" title={playerName}>{nameOnCard}</p>

          <div className="fc27-base-card-stats">
            {STAT_ORDER.map((key) => (
              <div key={key} className="fc27-base-card-stat">
                <span className="fc27-base-card-stat-value">{values[key] ?? "—"}</span>
                <span className="fc27-base-card-stat-label">{labels[key]}</span>
              </div>
            ))}
          </div>

          <div className="fc27-base-card-icons-row">
            <CardIcon src={nationalityImageUrl} alt={nationalityName} className="fc27-base-card-flag" />
            <CardIcon src={clubImageUrl} alt={clubName ?? ""} className="fc27-base-card-crest" />
          </div>
        </div>

        {alternatePosition ? <span className="fc27-base-card-altpos-badge">{alternatePosition}</span> : null}
        {footLabel || skillWeak ? (
          <div className="fc27-base-card-meta-badges">
            {footLabel ? <span className="fc27-base-card-meta-badge">{footLabel}</span> : null}
            {skillWeak ? <span className="fc27-base-card-meta-badge">{skillWeak}</span> : null}
          </div>
        ) : null}
        {baseMeta != null ? <span className="fc27-base-card-meta-number">{baseMeta.toFixed(1)}</span> : null}
      </div>
    </div>
  );
}
