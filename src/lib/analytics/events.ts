export const EVENT_NAMES = [
  "app_open",
  "app_update",
  "login_success",
  "login_failed",
  "signup_success",
  "logout",
  "page_view",
  "cta_click",
  "desktop_download",
  "android_download",
  "bookmarklet_install",
  "partner_click",
  "sbc_solver_open",
  "sbc_solution_generated",
  "sbc_submitted",
  // Only emit sbc_completed when actual SBC completion is confirmed -
  // never as a synonym for sbc_solution_generated (a generated solution
  // may never be submitted, and a submission may fail).
  "sbc_completed",
  "sbc_failed",
  "evo_open",
  "evo_chain_generated",
  "player_search",
  "player_view",
  "squad_builder_open",
  "auto_build_started",
  "auto_build_completed",
  "share_squad_created",
  "share_squad_opened",
  "bookmarklet_open",
  "bookmarklet_authenticated",
  "feature_error",
  "api_error",
  "runtime_error",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export const CLIENT_TYPES = ["web", "desktop", "android", "bookmarklet", "extension"] as const;

export type ClientType = (typeof CLIENT_TYPES)[number];
