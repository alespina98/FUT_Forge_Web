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
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASSES: Record<NonNullable<GeneratedEvoCardProps["size"]>, string> = {
  sm: "w-16",
  md: "w-24",
  lg: "w-28 sm:w-36",
};

const STAT_KEYS = ["PAC", "SHO", "PAS", "DRI", "DEF", "PHY"] as const;

// Real FUT cards use FUT.GG's condensed "Cruyff Condensed" typeface - not
// available as a system/web-safe font here. FUT Forge Desktop's own
// card_renderer.py already documents its fallback for this exact gap
// ("Arial Narrow is a closer Windows fallback for FUT.GG's Cruyff
// Condensed"); this stack extends that same choice to non-Windows systems
// rather than introducing a new font dependency. Without it, this card
// silently inherited the site's global Geist UI font, which is wide and
// normal-weight - the opposite of the dense, heavy, condensed look every
// genuine FUT card has.
const CONDENSED_FONT = '"Arial Narrow", "Liberation Sans Narrow", "Roboto Condensed", Arial, sans-serif';
const condensedTextStyle: React.CSSProperties = {
  fontFamily: CONDENSED_FONT,
  fontStretch: "condensed",
  fontWeight: 800,
  letterSpacing: "-0.02em",
};

/**
 * Locally composes a card when FUT.GG has no genuine full-card render for a
 * hypothetical EVO result (no cardImagePath - only real catalog items get
 * one). The percentage layout below is taken directly from FUT Forge
 * Desktop's card_renderer.py (render_evo_step), itself calibrated against
 * FUT.GG's own R3e card component - only the rendering technology differs
 * (CSS here vs. QPainter there). Every input (background, colors, stats,
 * OVR, position, cutout) is real verified data already returned by the EVO
 * analysis; nothing here is fabricated.
 */
export function GeneratedEvoCard({ rarityImageUrl, textColor, cutoutUrl, ovr, position, name, stats, size = "md" }: GeneratedEvoCardProps) {
  const color = textColor || "#ffffff";
  // FUT.GG applies Referer-based hotlink protection to this specific asset
  // family (verified live: works server-side, 403/503s as a direct browser
  // <img src>) - relayed through our own server, which never sends a
  // cross-origin Referer, rather than a fragile direct CDN link.
  const proxiedRarityUrl = `/api/rarity-image?url=${encodeURIComponent(rarityImageUrl)}`;
  return (
    <div className={`glass relative aspect-[300/416] shrink-0 overflow-hidden rounded-xl ${SIZE_CLASSES[size]}`}>
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
      <div className="absolute text-center leading-none" style={{ left: "21.8%", top: "20.5%", transform: "translateX(-50%)", color, ...condensedTextStyle }}>
        <div className="text-[15px] sm:text-[19px]">{ovr ?? "—"}</div>
        <div className="mt-0.5 text-[8px] sm:text-[10px]">{position ?? ""}</div>
      </div>
      <div
        className="absolute max-w-[78%] truncate text-center"
        style={{ top: "62%", left: "50%", transform: "translateX(-50%)", color, fontSize: "9px", ...condensedTextStyle }}
      >
        {name}
      </div>
      <div className="absolute flex w-full justify-between px-[9%]" style={{ top: "73.5%" }}>
        {STAT_KEYS.map((key) => (
          <div key={key} className="flex flex-col items-center leading-none" style={{ color, ...condensedTextStyle }}>
            <span className="text-[6px] sm:text-[7px]">{key}</span>
            <span className="mt-0.5 text-[8px] sm:text-[9.5px]">{stats[key] ?? "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
