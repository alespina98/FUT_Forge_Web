"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Option = { value: string; label: string };

// Native <select> popups render with the OS/browser's own white/blue chrome
// and can't be restyled reliably cross-browser - this is a minimal custom
// dropdown so the Admin Panel stays FUT Forge-styled even while open. Same
// controlled value/onChange contract as a native select, so call sites keep
// their exact existing state/handlers.
//
// The option menu is rendered through a portal into document.body, positioned
// from the trigger's real screen coordinates, instead of as a normal
// absolutely-positioned descendant. Each Admin Panel card uses the .glass
// class (backdrop-filter), which creates its own CSS stacking context - a
// z-index on the menu only wins *within* that context, so the next sibling
// card (no z-index needed on its part at all) still painted over the open
// menu. Rendering into body sidesteps that containment entirely.
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
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const box = triggerRef.current!.getBoundingClientRect();
      setRect({ left: box.left, top: box.bottom + 6, width: box.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const current = options.find((option) => option.value === value);
  const sizeClass = size === "sm" ? "min-h-9 text-xs" : "min-h-10 text-sm";

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
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
      {open &&
        mounted &&
        rect &&
        createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            style={{ position: "fixed", left: rect.left, top: rect.top, minWidth: rect.width }}
            className="z-[999] max-h-60 w-max overflow-auto rounded-lg border border-white/10 bg-[#0d1116] py-1 shadow-[0_20px_50px_rgba(0,0,0,.55)]"
          >
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
          </ul>,
          document.body,
        )}
    </div>
  );
}
