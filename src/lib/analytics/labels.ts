// Italian, human-readable labels for the admin analytics dashboard - never
// show a raw event/client_type name in the primary UI, only in the
// collapsed "Dettagli tecnici" table.
export const EVENT_LABELS: Record<string, string> = {
  app_open: "Apertura app",
  app_update: "Aggiornamenti app",
  update_available: "Aggiornamenti disponibili",
  session_started: "Sessioni avviate",
  login_success: "Accessi riusciti",
  login_failed: "Accessi falliti",
  signup_success: "Nuove registrazioni",
  logout: "Disconnessioni",
  page_view: "Visualizzazioni pagina",
  cta_click: "Click sui pulsanti",
  desktop_download: "Download Desktop",
  android_download: "Download Android",
  bookmarklet_install: "Installazioni Bookmarklet",
  partner_click: "Click sui partner",
  sbc_solver_open: "Apertura SBC Solver",
  sbc_solution_generated: "Soluzioni SBC generate",
  sbc_quick_complete_started: "Operazioni Quick Complete avviate",
  sbc_submitted: "Sfide SBC completate",
  sbc_completed: "SBC completate",
  sbc_failed: "SBC fallite",
  sbc_group_completed: "Gruppi SBC completati",
  evo_open: "Apertura EVO Lab",
  evo_chain_generated: "Catene EVO generate",
  player_search: "Ricerche giocatori",
  player_view: "Visualizzazione giocatori",
  squad_builder_open: "Squad Builder",
  feature_opened: "Apertura funzione",
  auto_build_started: "Auto Builder avviato",
  auto_build_completed: "Auto Builder",
  auto_build_failed: "Auto Builder fallito",
  share_squad_created: "Squadre condivise",
  share_squad_opened: "Squadre condivise aperte",
  club_sync_started: "Sincronizzazione club avviata",
  club_sync_completed: "Sincronizzazione club completata",
  bookmarklet_open: "Apertura Bookmarklet",
  bookmarklet_authenticated: "Accessi da Bookmarklet",
  feature_error: "Errori di funzione",
  api_error: "Errori API",
  runtime_error: "Errori di runtime",
};

export function eventLabel(event: string): string {
  return EVENT_LABELS[event] ?? event;
}

// Which icon (see src/components/icons.tsx) best represents each event in
// the "Funzioni più usate" ranking - a string key, not a component, so this
// module stays framework-free and usable from the server route too.
export const EVENT_ICONS: Record<string, string> = {
  player_view: "eye",
  player_search: "search",
  squad_builder_open: "target",
  feature_opened: "bolt",
  auto_build_started: "bolt",
  auto_build_completed: "star",
  auto_build_failed: "alert",
  share_squad_created: "share",
  share_squad_opened: "share",
  club_sync_started: "route",
  club_sync_completed: "check",
  update_available: "refresh",
  sbc_solver_open: "tools",
  sbc_solution_generated: "tools",
  sbc_quick_complete_started: "tools",
  sbc_submitted: "tools",
  sbc_completed: "check",
  sbc_failed: "alert",
  sbc_group_completed: "check",
  evo_open: "route",
  evo_chain_generated: "route",
  bookmarklet_open: "bookmark",
  bookmarklet_authenticated: "bookmark",
  feature_error: "alert",
  api_error: "alert",
  runtime_error: "alert",
};

export function eventIconKey(event: string): string {
  return EVENT_ICONS[event] ?? "bolt";
}

export const CLIENT_LABELS: Record<string, string> = {
  web: "Web",
  desktop: "Desktop", // synthetic grouped filter value (see platformClause) - never stored
  desktop_windows: "Desktop Windows",
  desktop_macos: "Desktop macOS",
  android: "Android",
  chrome_extension: "Estensione Chrome",
  bookmarklet: "Bookmarklet",
  // pre-v1 spellings - normalized server-side before storage, kept here only
  // so any already-rendered/cached client-side data never shows a raw key
  extension: "Estensione Chrome",
};

export function clientLabel(value: string): string {
  return CLIENT_LABELS[value] ?? value;
}

export const CLIENT_ICONS: Record<string, string> = {
  web: "globe",
  desktop: "devices",
  desktop_windows: "windows",
  desktop_macos: "apple",
  android: "android",
  chrome_extension: "globe",
  bookmarklet: "bookmark",
  extension: "globe",
};

export function clientIconKey(value: string): string {
  return CLIENT_ICONS[value] ?? "devices";
}

// FUT Forge's own light-dashboard palette (lime/black/gray/red only - no
// categorical multi-hue set here): platform identity comes from the label,
// not a color, so every bar/series in this dashboard reads as one system.
export const CHART_LIME = "#7cb305"; // darker than the raw brand lime (#c8ff3d) - the raw tone is too pale to read as a 2px line/bar on white
export const CHART_BLACK = "#171b18";
export const CHART_MUTED = "#8a9086";
export const CHART_RED = "#dc2626";

export function isUnknownVersion(version: string | null | undefined): boolean {
  return !version || version === "unknown" || version === "na";
}
