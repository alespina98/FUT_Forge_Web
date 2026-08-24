"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "futforge-theme";
const OPTIONS: ThemePreference[] = ["system", "light", "dark"];

function storedPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const value = window.localStorage.getItem(STORAGE_KEY);
  return OPTIONS.includes(value as ThemePreference) ? value as ThemePreference : "system";
}

function resolvedTheme(preference: ThemePreference) {
  return preference === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    : preference;
}

function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  const resolved = resolvedTheme(preference);
  root.dataset.themePreference = preference;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
}

function ThemeGlyph({ preference }: { preference: ThemePreference }) {
  if (preference === "light") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
  if (preference === "dark") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>;
}

export function ThemeControl({ mobile = false, locale = "en" }: { mobile?: boolean; locale?: "en" | "it" }) {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const labels = locale === "it"
    ? { label: "Tema", system: "Sistema", light: "Chiaro", dark: "Scuro" }
    : { label: "Theme", system: "System", light: "Light", dark: "Dark" };

  useLayoutEffect(() => {
    const initial = storedPreference();
    applyTheme(initial);
    const frame = window.requestAnimationFrame(() => setPreference(initial));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => { if (storedPreference() === "system") applyTheme("system"); };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [open]);

  function select(next: ThemePreference) {
    window.localStorage.setItem(STORAGE_KEY, next);
    setPreference(next);
    applyTheme(next);
    setOpen(false);
  }

  if (mobile) {
    return <div className="mobile-theme-control" role="group" aria-label={labels.label}><span>{labels.label}</span><div>{OPTIONS.map((option) => <button key={option} type="button" onClick={() => select(option)} className={preference === option ? "active" : ""} aria-pressed={preference === option}><ThemeGlyph preference={option}/><span>{labels[option]}</span></button>)}</div></div>;
  }

  return (
    <div className="theme-control" ref={ref}>
      <button type="button" className="theme-control-trigger" aria-label={`${labels.label}: ${labels[preference]}`} title={`${labels.label}: ${labels[preference]}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <ThemeGlyph preference={preference}/><span className="sr-only">{labels.label}</span>
      </button>
      {open && <div className="theme-menu glass" role="menu" aria-label={labels.label}>{OPTIONS.map((option) => <button key={option} type="button" role="menuitemradio" aria-checked={preference === option} onClick={() => select(option)} className={preference === option ? "active" : ""}><ThemeGlyph preference={option}/><span>{labels[option]}</span></button>)}</div>}
    </div>
  );
}
