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
  return (
    <div className={`glass relative aspect-[300/416] shrink-0 overflow-hidden rounded-xl ${SIZE_CLASSES[size]}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- external, non-local artwork; same rationale as CardArt */}
      <img src={rarityImageUrl} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-contain" loading="lazy" />
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
      <div className="absolute text-center font-bold leading-tight" style={{ left: "21.8%", top: "20.5%", transform: "translateX(-50%)", color }}>
        <div className="text-[13px] sm:text-[17px]">{ovr ?? "—"}</div>
        <div className="text-[7px] sm:text-[9px]">{position ?? ""}</div>
      </div>
      <div
        className="absolute max-w-[76%] truncate text-center font-bold"
        style={{ top: "62%", left: "50%", transform: "translateX(-50%)", color, fontSize: "8px" }}
      >
        {name}
      </div>
      <div className="absolute flex w-full justify-between px-[9%]" style={{ top: "73.5%" }}>
        {STAT_KEYS.map((key) => (
          <div key={key} className="flex flex-col items-center leading-tight" style={{ color }}>
            <span className="text-[5px] font-bold sm:text-[6px]">{key}</span>
            <span className="text-[7px] font-bold sm:text-[8px]">{stats[key] ?? "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
