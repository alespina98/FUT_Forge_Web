export const EVENT_LABELS: Record<string, string> = {
  app_open: "App opens",
  app_update: "App updates",
  login_success: "Logins",
  login_failed: "Failed logins",
  signup_success: "Signups",
  logout: "Logouts",
  page_view: "Page views",
  cta_click: "CTA clicks",
  desktop_download: "Desktop downloads",
  android_download: "Android downloads",
  bookmarklet_install: "Bookmarklet installs",
  partner_click: "Partner clicks",
  sbc_solver_open: "SBC Solver opens",
  sbc_solution_generated: "SBC solutions generated",
  sbc_submitted: "SBC submissions",
  sbc_completed: "SBC completions",
  sbc_failed: "SBC failures",
  evo_open: "EVO Lab opens",
  evo_chain_generated: "EVO chains generated",
  player_search: "Player searches",
  player_view: "Player views",
  squad_builder_open: "Squad Builder opens",
  auto_build_started: "Auto Builds started",
  auto_build_completed: "Auto Builds generated",
  share_squad_created: "Shared squads",
  share_squad_opened: "Shared squads opened",
  bookmarklet_open: "Bookmarklet opens",
  bookmarklet_authenticated: "Bookmarklet sign-ins",
  feature_error: "Feature errors",
  api_error: "API errors",
  runtime_error: "Runtime errors",
};

export function eventLabel(event: string): string {
  return EVENT_LABELS[event] ?? event;
}

export const CLIENT_LABELS: Record<string, string> = {
  web: "Web",
  desktop: "Desktop",
  android: "Android",
  bookmarklet: "Bookmarklet",
  extension: "Extension",
};

export function clientLabel(value: string): string {
  return CLIENT_LABELS[value] ?? value;
}

// Fixed categorical color per platform - never cycled/reassigned, so the same
// platform reads as the same color across every chart on the dashboard.
// Values are the dark-mode steps from the validated categorical palette
// (blue/orange/aqua/yellow/magenta), checked against the admin panel's
// #070908 surface.
export const CLIENT_COLORS: Record<string, string> = {
  web: "#3987e5",
  desktop: "#d95926",
  android: "#199e70",
  bookmarklet: "#c98500",
  extension: "#d55181",
};

export function clientColor(value: string): string {
  return CLIENT_COLORS[value] ?? "#898781";
}
