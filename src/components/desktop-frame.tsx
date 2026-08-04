"use client";

import Image from "next/image";
import { PRODUCT } from "@/lib/copy";
import { ForgeMark } from "./icons";
import { useI18n } from "./i18n-provider";

type DesktopFrameProps = { src: string; alt: string; label: string; className?: string; width?: number; height: number };

export function DesktopFrame({ src, alt, label, className = "", width = 1290, height }: DesktopFrameProps) {
  const { t } = useI18n();

  return (
    <figure className={`desktop-frame ${className}`} aria-label={t.frame.aria}>
      <div className="desktop-frame-glow" />
      <div className="desktop-frame-shell">
        <div className="desktop-frame-bar"><div className="desktop-frame-brand"><ForgeMark /><span>{PRODUCT.wordmark.join(" ")}</span><i>{t.frame.desktop}</i></div><div className="desktop-frame-title"><span className="frame-live-dot" />{label}</div><div className="desktop-frame-controls" aria-hidden><i /><i /><i /></div></div>
        <div className="desktop-frame-screen"><Image src={src} alt={alt} width={width} height={height} loading="lazy" sizes="(max-width: 768px) 96vw, (max-width: 1280px) 92vw, 1180px" /></div>
        <div className="desktop-frame-reflection" />
      </div>
      <figcaption><span><i />{t.frame.captured}</span><p>{t.frame.platform}</p></figcaption>
    </figure>
  );
}


