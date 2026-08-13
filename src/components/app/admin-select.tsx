"use client";

import { useEffect, useRef, useState } from "react";

type Option = { value: string; label: string };

// Native <select> popups render with the OS/browser's own white/blue chrome
// and can't be restyled reliably cross-browser - this is a minimal custom
// dropdown so the Admin Panel stays FUT Forge-styled even while open. Same
// controlled value/onChange contract as a native select, so call sites keep
// their exact existing state/handlers.
export function AdminSelect({
  value,
  onChange,
  options,
  disabled,
  className = "",
  size = "md",
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const current = options.find((option) => option.value === value);
  const sizeClass = size === "sm" ? "min-h-9 text-xs" : "min-h-10 text-sm";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-[#12161a] px-3 text-left text-white transition-colors disabled:opacity-50 ${sizeClass} ${open ? "border-lime/50" : "border-white/10"}`}
      >
        <span className="truncate">{current?.label ?? value}</span>
        <svg viewBox="0 0 20 20" fill="none" className={`size-3.5 shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          <path d="m5 8 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul role="listbox" className="absolute left-0 top-full z-20 mt-1.5 max-h-60 w-max min-w-full overflow-auto rounded-lg border border-white/10 bg-[#0d1116] py-1 shadow-[0_20px_50px_rgba(0,0,0,.55)]">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`block w-full whitespace-nowrap px-3 py-2 text-left text-xs transition-colors ${
                  option.value === value ? "bg-lime/10 text-lime" : "text-white/80 hover:bg-white/[.07] hover:text-white"
                }`}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
