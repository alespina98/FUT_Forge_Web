"use client";

import { useState } from "react";

// Real EA CDN portrait photo (see the Step 5B card-asset audit: avatar_url
// is a genuine official photo, never baked-in stats, so it can't go
// "stale" the way the EA shield/card image can - that field was found to
// carry mismatched FC25-era stats and is deliberately not used anywhere).
// Not every player has a working photo (many return 403 - verified live,
// e.g. lower-rated players) so this always renders a clean FUT Forge
// fallback instead of a broken-image icon, never a raw <img> alone.
// fit="cover" (default) fills its box and crops, used by the old flat
// rectangle tiles. fit="contain" never crops - required by the FC27 item
// card (Step 5C), which composites the whole EA cutout into a shaped card
// instead of a cropped headshot rectangle.
export function PlayerPortrait({ src, alt, overall, className = "", fit = "cover" }: { src: string | null; alt: string; overall: number; className?: string; fit?: "cover" | "contain" }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`fc27-portrait-fallback ${className}`} aria-hidden>
        <span>{overall}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- deliberate: a
    // remote EA CDN photo, not something to run through next/image's
    // domain allowlist/optimizer for a handful of images per page.
    <img
      src={src}
      alt={alt}
      className={`${fit === "contain" ? "fc27-portrait-img-contain" : "fc27-portrait-img"} ${className}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
