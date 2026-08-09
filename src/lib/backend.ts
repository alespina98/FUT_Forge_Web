const REQUEST_TIMEOUT_MS = 15_000;

export type BackendSuccess = { ok: true; status: number; body: unknown };
export type BackendFailure = { ok: false; status: number; error: { code: string; message: string } };
export type BackendResult = BackendSuccess | BackendFailure;

function isErrorEnvelope(value: unknown): value is { error: { code?: unknown; message?: unknown } } {
  return typeof value === "object" && value !== null && typeof (value as { error?: unknown }).error === "object" && (value as { error?: unknown }).error !== null;
}

function getBackendBaseUrl(): string | null {
  const raw = process.env.FUTFORGE_BACKEND_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return raw.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

/**
 * Server-only transport to the FUT Forge Python backend. Deliberately
 * contains no FUT Forge pricing/EVO/grade logic — it only moves bytes and
 * never returns the configured base URL to a caller.
 */
export async function fetchFromBackend(path: string, init?: RequestInit): Promise<BackendResult> {
  const base = getBackendBaseUrl();
  if (!base) {
    return { ok: false, status: 500, error: { code: "backend_not_configured", message: "The Web App server is not configured with a backend to talk to." } };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, { ...init, signal: controller.signal, cache: "no-store" });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      status: timedOut ? 504 : 502,
      error: timedOut
        ? { code: "backend_timeout", message: "The backend did not respond in time." }
        : { code: "backend_unreachable", message: "The backend could not be reached." },
    };
  } finally {
    clearTimeout(timeout);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, status: 502, error: { code: "backend_invalid_response", message: "The backend returned a response that was not valid JSON." } };
  }

  if (!response.ok) {
    const code = isErrorEnvelope(body) && typeof body.error.code === "string" ? body.error.code : "backend_error";
    const message = isErrorEnvelope(body) && typeof body.error.message === "string" ? body.error.message : "The backend returned an error.";
    return { ok: false, status: response.status, error: { code, message } };
  }

  return { ok: true, status: response.status, body };
}
