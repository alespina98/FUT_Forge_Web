"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "@/components/icons";
import { playerUrlSlug } from "@/lib/fc27/player-slug";
import type { PlayerSuggestion } from "@/lib/fc27/player-search";
import { track } from "@/lib/analytics/client";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 220;

type Copy = {
  searchLabel: string;
  searchPlaceholder: string;
  searching: string;
  noResultsTitle: string;
};

// Live typeahead over player NAMES only (see the server-side filter in
// player-search.ts for why club/nation/league never surface a match here).
// Selecting a suggestion navigates straight to the player - it never
// touches the full grid. The existing full-search (?q=, filters the grid)
// is preserved as a fallback: Enter with nothing highlighted calls
// onCommitSearch, same as the old per-keystroke-debounced behavior used to.
export function Fc27PlayerSearchAutocomplete({ initialQuery, onCommitSearch, onSelect, inputId = "fc27-search", t }: { initialQuery: string; onCommitSearch?: (value: string) => void; onSelect?: (player: PlayerSuggestion) => void; inputId?: string; t: Copy }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keeps the box in sync with browser back/forward or a direct ?q= link -
  // same role the old inline effect in players-controls.tsx played.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- prop changes are external URL/navigation state that must replace the controlled input value.
  useEffect(() => setValue(initialQuery), [initialQuery]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
  }, []);

  function fetchSuggestions(query: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    fetch(`/api/fc27/players/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((res) => res.json() as Promise<{ results: PlayerSuggestion[] }>)
      .then((data) => {
        setSuggestions(data.results);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return; // superseded by a newer keystroke - never overwrite with a stale response
        setSuggestions([]);
        setLoading(false);
      });
  }

  function onChange(next: string) {
    setValue(next);
    setHighlighted(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    const trimmed = next.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setOpen(false);
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setOpen(true);
    debounceRef.current = setTimeout(() => fetchSuggestions(trimmed), DEBOUNCE_MS);
  }

  function goToPlayer(s: PlayerSuggestion) {
    setOpen(false);
    track("player_search", { method: "autocomplete" });
    if (onSelect) {
      setValue(s.display_name);
      onSelect(s);
    } else {
      router.push(`/fc27/players/${playerUrlSlug(s.ea_player_id, s.slug)}`);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      if (!open || suggestions.length === 0) return;
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      if (!open || suggestions.length === 0) return;
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (open && highlighted >= 0 && suggestions[highlighted]) {
        e.preventDefault();
        goToPlayer(suggestions[highlighted]);
      } else {
        setOpen(false);
        track("player_search", { method: "full_search" });
        onCommitSearch?.(value);
      }
    } else if (e.key === "Escape") {
      if (open) { e.preventDefault(); setOpen(false); }
    }
  }

  const trimmed = value.trim();
  const showNoResults = open && !loading && trimmed.length >= MIN_QUERY_LENGTH && suggestions.length === 0;

  return (
    <div ref={containerRef} className="fc27-search-box-wrap">
      <label className="fc27-search-box">
        <SearchIcon className="size-4 shrink-0 text-white/40" />
        <span className="sr-only">{t.searchLabel}</span>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => { if (trimmed.length >= MIN_QUERY_LENGTH) setOpen(true); }}
          placeholder={t.searchPlaceholder}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${inputId}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={highlighted >= 0 ? `${inputId}-option-${highlighted}` : undefined}
          autoComplete="off"
        />
        {loading && <span className="fc27-search-spinner" aria-hidden />}
      </label>

      {open && (
        <div id={`${inputId}-listbox`} role="listbox" className="fc27-search-dropdown">
          {loading && suggestions.length === 0 ? (
            <p className="fc27-search-status">{t.searching}</p>
          ) : showNoResults ? (
            <p className="fc27-search-status">{t.noResultsTitle}</p>
          ) : (
            suggestions.map((s, i) => (
              <button
                key={s.ea_player_id}
                id={`${inputId}-option-${i}`}
                role="option"
                aria-selected={i === highlighted}
                type="button"
                className={`fc27-search-option${i === highlighted ? " fc27-search-option-active" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => goToPlayer(s)}
              >
                <span className="fc27-search-option-name">{s.display_name}</span>
                <span className="fc27-search-option-meta">
                  <b>{s.overall}</b> {s.position_short_label}
                  {s.club_name ? <em>{s.club_name}</em> : null}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
