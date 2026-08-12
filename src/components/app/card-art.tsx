"use client";

import { useState } from "react";
import { ForgeMark } from "../icons";

type CardArtProps = {
  src: string | null | undefined;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
};

const SIZE_CLASSES: Record<NonNullable<CardArtProps["size"]>, string> = {
  xs: "w-10",
  sm: "w-16",
  md: "w-24",
  lg: "w-28 sm:w-36",
  // Tuned so aspect-[300/416] renders ~155-180px tall on desktop (My Club grid).
  xl: "w-28 lg:w-32",
};

// FUT.GG player-item card renders are consistently ~300x416 (verified live).
// object-fit: contain inside that fixed ratio means we never distort or crop
// a real image, and the same box degrades cleanly to the fallback mark below.
export function CardArt({ src, alt, size = "md" }: CardArtProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className={`glass flex aspect-[300/416] shrink-0 items-center justify-center overflow-hidden rounded-xl ${SIZE_CLASSES[size]}`}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- external, non-local artwork; Next/Image would require allowlisting the CDN host for a handful of small thumbnails
        <img src={src as string} alt={alt} className="h-full w-full object-contain" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <ForgeMark className="opacity-25" />
      )}
    </div>
  );
}
