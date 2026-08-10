"use client";

type Stats = { PAC?: number | null; SHO?: number | null; PAS?: number | null; DRI?: number | null; DEF?: number | null; PHY?: number | null };

type GeneratedEvoCardProps = {
  rarityImageUrl: string;
  textColor?: string | null;
  cutoutUrl?: string | null;
  ovr: number | string | null;
  position?: string | null;
  name: string;
  stats: Stats;
  size?: "xs" | "sm" | "md" | "lg";
};

const SIZE_CLASSES: Record<NonNullable<GeneratedEvoCardProps["size"]>, string> = {
  xs: "w-10",
  sm: "w-16",
  md: "w-24",
  lg: "w-28 sm:w-36",
};

// Every geometry and typography value below is ported directly from FUT
// Forge Desktop's card_renderer.py (render_evo_step), the reference
// implementation for locally-composed EVO cards - not eyeballed against a
// screenshot. Desktop computes each font's pixel size as `cardWidth *
// fraction` and each text box as a `left/top/width/height` percentage of
// the card, then center-aligns text inside that box (Qt's
// QPainter.drawText(rect, Qt.AlignCenter, ...)).
//
// CSS reproduces that 1:1: `left`/`width` percentages resolve against the
// card's own width and `top`/`height` percentages against its own height
// (the normal CSS percentage-resolution rule for an absolutely positioned
// box), which is exactly Desktop's W-fraction / H-fraction split. Font
// size can't use plain `%` (that resolves against the *parent's font
// size*, not the box's width), so it uses `cqw` (1cqw = 1% of the nearest
// `container-type` ancestor's width) instead - the CSS unit that actually
// means "cardWidth * fraction", matching Desktop's formula rather than
// approximating it with fixed pixel breakpoints.
const CONDENSED_FONT = '"Arial Narrow", "Liberation Sans Narrow", "Roboto Condensed", Arial, sans-serif';
const NAME_FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

type Box = { left: number; top: number; width: number; height: number };

// Desktop: _font(px, condensed, bold) always draws bold=True; DemiBold is
// never actually used by render_evo_step, and no letter-spacing is set
// anywhere - the condensed *font family* alone (Arial Narrow) produces the
// tight look, so none is added here either.
function textBoxStyle(box: Box, color: string, fontSizeCqw: number, condensed: boolean): React.CSSProperties {
  return {
    position: "absolute",
    left: `${box.left}%`,
    top: `${box.top}%`,
    width: `${box.width}%`,
    height: `${box.height}%`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    color,
    fontFamily: condensed ? CONDENSED_FONT : NAME_FONT,
    fontStretch: condensed ? "condensed" : undefined,
    fontWeight: 700,
    fontSize: `${fontSizeCqw}cqw`,
    lineHeight: 1,
    whiteSpace: "nowrap",
  };
}

// Desktop: cx = W*.218, top = H*.218; OVR box = (cx-W*.10, top, W*.20, H*.075).
const OVR_BOX: Box = { left: 11.8, top: 21.8, width: 20, height: 7.5 };
const OVR_FONT_CQW = 15.2;

// Desktop: position box = (cx-W*.09, top+H*.091, W*.18, H*.046).
const POSITION_BOX: Box = { left: 12.8, top: 30.9, width: 18, height: 4.6 };
const POSITION_FONT_CQW = 7.4;

// Desktop: name box = (W*(.5-.752/2), H*.626, W*.752, H*.074), font fit
// between W*.090 (max) and W*.056 (min) via horizontalAdvance measurement.
// This uses Desktop's max size flat - the box is generous (75.2% of card
// width) and, combined with the last-name-only text below, comfortably
// fits real surnames without needing a canvas-measurement shrink loop;
// `truncate` remains as an honest fallback for the rare very long name.
const NAME_BOX: Box = { left: 12.4, top: 62.6, width: 75.2, height: 7.4 };
const NAME_FONT_CQW = 9.0;

// Desktop: labels=("PAC","SHO","PAS","DRI","DEF","PHY"),
// centres=(.190,.314,.438,.562,.686,.810); label_y=H*.744, value_y=H*.792;
// label box height H*.034 (so top = label_y - H*.017); value box height
// H*.048 (top = value_y - H*.024); both boxes W*.090 wide.
const STAT_KEYS = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"] as const;
const STAT_CENTRES: Record<(typeof STAT_KEYS)[number], number> = { PAC: 19.0, SHO: 31.4, PAS: 43.8, DRI: 56.2, DEF: 68.6, PHY: 81.0 };
const STAT_LABEL_FONT_CQW = 5.0;
const STAT_VALUE_FONT_CQW = 8.0;

function statBox(centre: number, top: number, height: number): Box {
  return { left: centre - 4.5, top, width: 9.0, height };
}

/**
 * Locally composes a card when FUT.GG has no genuine full-card render for a
 * hypothetical EVO result (no cardImagePath - only real catalog items get
 * one). The background/cutout percentage layout below is taken directly
 * from FUT Forge Desktop's card_renderer.py (render_evo_step), itself
 * calibrated against FUT.GG's own R3e card component - only the rendering
 * technology differs (CSS here vs. QPainter there). Every input
 * (background, colors, stats, OVR, position, cutout) is real verified data
 * already returned by the EVO analysis; nothing here is fabricated.
 */
export function GeneratedEvoCard({ rarityImageUrl, textColor, cutoutUrl, ovr, position, name, stats, size = "md" }: GeneratedEvoCardProps) {
  const color = textColor || "#ffffff";
  // FUT.GG applies Referer-based hotlink protection to this specific asset
  // family (verified live: works server-side, 403/503s as a direct browser
  // <img src>) - relayed through our own server, which never sends a
  // cross-origin Referer, rather than a fragile direct CDN link.
  const proxiedRarityUrl = `/api/rarity-image?url=${encodeURIComponent(rarityImageUrl)}`;
  // Desktop draws only the last name (genuine FUT cards show a surname,
  // e.g. "Messi", not "Lionel Messi") - the web app only has a single
  // combined `name`, so the last whitespace-separated token approximates
  // Desktop's lastName field.
  const displayName = name.trim().split(/\s+/).pop() || name;
  return (
    <div className={`glass relative aspect-[300/416] shrink-0 overflow-hidden rounded-xl [container-type:inline-size] ${SIZE_CLASSES[size]}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- external, non-local artwork; same rationale as CardArt */}
      <img src={proxiedRarityUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-contain" loading="lazy" />
      {cutoutUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- external, non-local artwork
        <img
          src={cutoutUrl}
          alt={name}
          loading="lazy"
          className="absolute object-contain"
          style={{ width: "64.3%", left: "56%", top: "17.4%", transform: "translateX(-50%)" }}
        />
      )}
      <div style={textBoxStyle(OVR_BOX, color, OVR_FONT_CQW, true)}>{ovr ?? "—"}</div>
      <div style={textBoxStyle(POSITION_BOX, color, POSITION_FONT_CQW, true)}>{position ?? ""}</div>
      <div style={textBoxStyle(NAME_BOX, color, NAME_FONT_CQW, false)}>
        <span className="max-w-full truncate">{displayName}</span>
      </div>
      {STAT_KEYS.map((key) => {
        const centre = STAT_CENTRES[key];
        return (
          <div key={key}>
            <div style={textBoxStyle(statBox(centre, 72.7, 3.4), color, STAT_LABEL_FONT_CQW, true)}>{key}</div>
            <div style={textBoxStyle(statBox(centre, 76.8, 4.8), color, STAT_VALUE_FONT_CQW, true)}>{stats[key] ?? "—"}</div>
          </div>
        );
      })}
    </div>
  );
}
