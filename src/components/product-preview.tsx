"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ForgeMark } from "./icons";

const bootSteps = [
  "Initializing Workspace...",
  "Loading Chemistry Engine...",
  "Loading SBC Solver...",
  "Loading Squad Builder...",
  "Loading Evolution Engine...",
  "Synchronizing Club...",
  "Ready.",
];

type BootStyle = CSSProperties & { "--boot-delay": string };

export function BootSequenceSection() {
  const rootRef = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    let finish = 0;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setStarted(true);
        finish = window.setTimeout(() => setComplete(true), 4050);
        observer.disconnect();
      }
    }, { threshold: 0.32 });

    observer.observe(element);
    return () => {
      observer.disconnect();
      window.clearTimeout(finish);
    };
  }, []);

  useEffect(() => {
    if (!started) return;
    const began = performance.now();
    const timer = window.setInterval(() => {
      const next = Math.min(100, Math.round(((performance.now() - began) / 3650) * 100));
      setProgress(next);
      if (next === 100) window.clearInterval(timer);
    }, 100);
    return () => window.clearInterval(timer);
  }, [started]);

  return (
    <section
      id="launch"
      ref={rootRef}
      className={`brand-boot-section boot-sequence ${started ? "is-booting" : ""} ${complete ? "is-complete" : ""}`}
      aria-label="FUT Forge Desktop launch sequence"
    >
      <div className="brand-boot-stage">
        <div className="brand-splash">
          <div className="brand-splash-glow" />
          <div className="brand-splash-content">
            <div className="brand-splash-logo"><ForgeMark /><span>FUT <b>FORGE</b></span></div>
            <p className="brand-splash-version">FUT Forge Desktop 2.10</p>
            <h2>Build. Optimize. Dominate.</h2>
            <div className="brand-splash-status"><i />Workspace ready</div>
          </div>
        </div>
        <div className="boot-panel" aria-hidden={complete}>
          <div className="boot-ambient" />
          <div className="boot-content">
            <div className="boot-logo"><ForgeMark /></div>
            <strong>FUT Forge Desktop 2.10</strong>
            <div className="boot-log">
              {bootSteps.map((step, index) => (
                <span key={step} className={index === bootSteps.length - 1 ? "ready" : ""} style={{ "--boot-delay": `${0.35 + index * 0.43}s` } as BootStyle}>
                  <i />{step}
                </span>
              ))}
            </div>
            <div className="boot-progress"><i /></div>
            <div className="boot-progress-meta"><span>SECURE STARTUP</span><span>{progress}%</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
