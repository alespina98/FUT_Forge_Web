"use client";

import { useEffect, useState } from "react";
import { PRODUCT } from "@/lib/copy";
import { ForgeMark } from "./icons";
import { useI18n } from "./i18n-provider";

export function AmbientEffects() {
  const [ready, setReady] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    const root = document.documentElement;
    const body = document.body;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const render = () => {
      currentX += (targetX - currentX) * 0.075;
      currentY += (targetY - currentY) * 0.075;
      root.style.setProperty("--hero-x", `${currentX.toFixed(2)}px`);
      root.style.setProperty("--hero-y", `${currentY.toFixed(2)}px`);
      frame = requestAnimationFrame(render);
    };
    const move = (event: PointerEvent) => {
      root.style.setProperty("--pointer-x", `${event.clientX}px`);
      root.style.setProperty("--pointer-y", `${event.clientY}px`);
      targetX = ((event.clientX / window.innerWidth) - 0.5) * 18;
      targetY = ((event.clientY / window.innerHeight) - 0.5) * 12;
    };
    const scroll = () => {
      const limit = root.scrollHeight - window.innerHeight;
      root.style.setProperty("--scroll-progress", `${limit > 0 ? (window.scrollY / limit) * 100 : 0}%`);
      body.classList.toggle("is-scrolled", window.scrollY > 44);
    };
    const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        reveal.unobserve(entry.target);
      }
    }), { rootMargin: "0px 0px -10%", threshold: 0.12 });

    document.querySelectorAll("[data-reveal]").forEach((element) => reveal.observe(element));
    if (finePointer) window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    scroll();
    if (!reducedMotion) frame = requestAnimationFrame(render);
    const readyFrame = requestAnimationFrame(() => { body.classList.add("is-ready"); setReady(true); });

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(readyFrame);
      reveal.disconnect();
      if (finePointer) window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll);
      body.classList.remove("is-scrolled", "is-ready");
    };
  }, []);

  return <><div className={`page-loader ${ready ? "loaded" : ""}`} aria-hidden><div className="loader-brand"><ForgeMark /><span>{PRODUCT.wordmark.join(" ")}</span></div><i /><span className="sr-only">{t.loading}</span></div><div className="cursor-ambient" aria-hidden /><div className="scroll-progress" aria-hidden /></>;
}


