// Event contract v1. Names already shipped by the Web client are never
// renamed here (breaking that would fragment already-collected history and
// require a simultaneous multi-repo release) - this only ADDS names for
// real, previously-uninstrumented native call sites (see CLAUDE session
// notes / commit history for the audit that grounds each addition).
export const EVENT_NAMES = [
  "app_open",
  "app_update",
  "update_available",
  "session_started",
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
  // Generic "opened this section" signal for features with no dedicated event name of their own
  // (Transfers, Settings, from the Chrome extension's usage bridge) - distinguished by the
  // allowlisted "feature" property. Reuse this for a new no-dedicated-name feature rather than
  // adding another one-off *_open event.
  "feature_opened",
  "auto_build_started",
  "auto_build_completed",
  "auto_build_failed",
  "share_squad_created",
  "share_squad_opened",
  "club_sync_started",
  "club_sync_completed",
  "bookmarklet_open",
  "bookmarklet_authenticated",
  "feature_error",
  "api_error",
  "runtime_error",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

// Canonical platform values (event contract v1). Desktop is split by OS -
// the desktop codebase genuinely ships both a Windows and a macOS build
// from one Python source tree (see BUILD_EXE.bat / BUILD_MAC.sh), so
// collapsing them into one "desktop" value would hide real adoption/version
// differences the dashboard needs to show separately.
export const CLIENT_TYPES = ["web", "desktop_windows", "desktop_macos", "android", "chrome_extension", "bookmarklet"] as const;

export type ClientType = (typeof CLIENT_TYPES)[number];

// Pre-v1 values already stored in production (and potentially still sent by
// not-yet-updated client builds during the rollout window). Accepted at the
// validation layer and normalized to their v1 equivalent before storage -
// never stored as-is - so older clients never get silently dropped and the
// stored data never has two spellings of the same platform.
export const LEGACY_CLIENT_TYPE_MAP: Record<string, ClientType> = {
  desktop: "desktop_windows",
  extension: "chrome_extension",
};

export function normalizeClientType(value: string): ClientType | null {
  if ((CLIENT_TYPES as readonly string[]).includes(value)) return value as ClientType;
  return LEGACY_CLIENT_TYPE_MAP[value] ?? null;
}

export const ALL_ACCEPTED_CLIENT_TYPES = [...CLIENT_TYPES, ...Object.keys(LEGACY_CLIENT_TYPE_MAP)] as const;

// Explicit allowlist of `properties` keys accepted across every event -
// simpler and easier to audit than a per-event allowlist while still
// refusing to let a client dump arbitrary/unbounded metadata into an event.
export const ALLOWED_PROPERTY_KEYS = [
  "feature", "reason", "outcome", "method", "priority", "provider", "path", "query",
  "cta", "location", "channel", "trigger", "healthy", "exc_type", "message",
  "from_version", "to_version", "platform_target", "position", "ea_player_id",
] as const;

export const CURRENT_EVENT_CONTRACT_VERSION = 1;
