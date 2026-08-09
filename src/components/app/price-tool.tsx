"use client";

import { useState } from "react";
import { useI18n } from "../i18n-provider";

type Status = "idle" | "loading" | "success" | "error";

// Shape verified directly against futforge_backend/app.py's GET /api/pricing
// handler and futforge_shared/pricing.fetch_futgg_price_data(): the backend
// returns the full FUT.GG manifest, not a per-player lookup. `idx.d` and
// `blob.p` are the only array fields whose presence is confirmed there.
type PricingManifestData = {
  manifestVersion: number;
  indexUrl: string;
  priceUrl: string;
  idx: Record<string, unknown> & { d?: unknown[] };
  blob: Record<string, unknown> & { p?: unknown[] };
};

type PricingSuccessEnvelope = { ok: true; cached: boolean; data: PricingManifestData };
type BackendErrorEnvelope = { ok: false; error: { code: string; message: string } };

function isPricingSuccess(value: unknown): value is PricingSuccessEnvelope {
  return typeof value === "object" && value !== null && (value as { ok?: unknown }).ok === true && "data" in value;
}

function isBackendError(value: unknown): value is BackendErrorEnvelope {
  return typeof value === "object" && value !== null && (value as { ok?: unknown }).ok === false;
}

export function PriceTool() {
  const { t } = useI18n();
  const p = t.app.price;
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<PricingSuccessEnvelope | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  async function load() {
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch("/api/price", { cache: "no-store" });
      const body: unknown = await response.json().catch(() => null);
      if (isPricingSuccess(body)) {
        setResult(body);
        setStatus("success");
        return;
      }
      setError(isBackendError(body) ? body.error : { code: "unexpected_response", message: p.genericError });
      setStatus("error");
    } catch {
      setError({ code: "network_error", message: p.networkError });
      setStatus("error");
    }
  }

  const indexCount = Array.isArray(result?.data.idx.d) ? result.data.idx.d.length : null;
  const priceCount = Array.isArray(result?.data.blob.p) ? result.data.blob.p.length : null;

  return (
    <div className="mx-auto max-w-2xl">
      <p className="section-label">{p.eyebrow}</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">{p.title}</h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-white/50">{p.lead}</p>

      <div className="glass mt-8 rounded-2xl p-6 sm:p-8">
        <button type="button" className="button-primary" onClick={load} disabled={status === "loading"}>
          {status === "loading" ? p.loadingButton : p.loadButton}
        </button>

        <div className="mt-6" aria-live="polite">
          {status === "idle" && <p className="text-sm text-white/40">{p.emptyState}</p>}

          {status === "loading" && (
            <p className="text-sm text-white/50" role="status">
              {p.loadingState}
            </p>
          )}

          {status === "error" && error && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/[.06] p-4" role="alert">
              <p className="text-sm font-semibold text-red-300">{p.errorTitle}</p>
              <p className="mt-1 text-sm text-white/60">{error.message}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[.12em] text-white/30">{error.code}</p>
            </div>
          )}

          {status === "success" && result && (
            <div>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[.12em] text-white/35">{p.manifestVersion}</dt>
                  <dd className="mt-1 text-sm font-semibold">{result.data.manifestVersion}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[.12em] text-white/35">{p.cached}</dt>
                  <dd className="mt-1 text-sm font-semibold">{result.cached ? p.yes : p.no}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[.12em] text-white/35">{p.indexEntries}</dt>
                  <dd className="mt-1 text-sm font-semibold">{indexCount ?? "—"}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[.12em] text-white/35">{p.priceEntries}</dt>
                  <dd className="mt-1 text-sm font-semibold">{priceCount ?? "—"}</dd>
                </div>
              </dl>
              <p className="mt-5 text-xs leading-5 text-white/40">{p.searchNotAvailable}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
