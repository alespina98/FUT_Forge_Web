"use client";

import { useState, type ReactNode } from "react";
import { CHART_LIME, CHART_BLACK, CHART_RED } from "@/lib/analytics/labels";
import { AlertTriangleIcon } from "@/components/icons";

// ---- design tokens (this dashboard is always the light FUT Forge palette,
// independent of the site-wide dark/light toggle) ----
export const TEXT_PRIMARY = "#171b18";
export const TEXT_SECONDARY = "#55605a";
export const TEXT_MUTED = "#8a9086";
export const BORDER = "rgba(23,27,24,.08)";
export const CARD_BG = "#ffffff";

export function Card({ title, subtitle, action, children, className = "" }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgba(23,27,24,.04),0_8px_24px_rgba(23,27,24,.04)] sm:p-6 ${className}`} style={{ borderColor: BORDER }}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold" style={{ color: TEXT_PRIMARY }}>{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs" style={{ color: TEXT_MUTED }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <p className="py-6 text-center text-sm" style={{ color: TEXT_MUTED }}>{label}</p>;
}

function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}K`;
  return value.toLocaleString("it-IT");
}

// ---------------------------------------------------------------- KPI card
export function KpiCard({ icon, label, value, delta, comparisonLabel, invert }: { icon: ReactNode; label: string; value: number; delta: number; comparisonLabel: string; invert?: boolean }) {
  const flat = delta === 0;
  const up = delta > 0;
  const good = flat ? null : invert ? !up : up;
  const color = flat ? TEXT_MUTED : good ? "#3a7d0e" : CHART_RED;
  const sign = flat ? "" : up ? "+" : "−";
  const arrow = flat ? "—" : up ? "▲" : "▼";
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgba(23,27,24,.04),0_8px_24px_rgba(23,27,24,.04)]" style={{ borderColor: BORDER }}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(124,179,5,.12)", color: "#3a7d0e" }}>{icon}</span>
        <span className="text-sm font-medium" style={{ color: TEXT_SECONDARY }}>{label}</span>
      </div>
      <p className="mt-3 text-[2.5rem] font-bold leading-none tracking-tight" style={{ color: TEXT_PRIMARY }}>{compactNumber(value)}</p>
      <p className="mt-2 text-xs font-semibold" style={{ color }}>
        {arrow} {sign}{Math.abs(delta).toLocaleString("it-IT")} {comparisonLabel}
      </p>
    </div>
  );
}

// ---------------------------------------------------------- time series
export type TimeSeriesPoint = { bucket: string; activeUsers: number; actions: number };

function formatBucket(bucket: string, hourly: boolean): string {
  const date = new Date(bucket.endsWith("Z") || bucket.includes("T") ? bucket : `${bucket}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return bucket;
  return hourly
    ? date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", hour12: false })
    : date.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

export function TimeSeriesChart({ points, hourly }: { points: TimeSeriesPoint[]; hourly: boolean }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  if (!points.length || points.every((p) => p.activeUsers === 0 && p.actions === 0)) {
    return <EmptyState label="Nessuna attività registrata in questo periodo." />;
  }
  const width = 680;
  const height = 260;
  const padding = { top: 16, right: 40, bottom: 30, left: 34 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const maxUsers = Math.max(...points.map((p) => p.activeUsers), 1);
  const maxActions = Math.max(...points.map((p) => p.actions), 1);
  const x = (i: number) => padding.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yUsers = (v: number) => padding.top + innerH - (v / maxUsers) * innerH;
  const yActions = (v: number) => padding.top + innerH - (v / maxActions) * innerH;
  const usersLine = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yUsers(p.activeUsers).toFixed(1)}`).join(" ");
  const usersArea = `${usersLine} L${x(points.length - 1).toFixed(1)},${(padding.top + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padding.top + innerH).toFixed(1)} Z`;
  const actionsLine = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${yActions(p.actions).toFixed(1)}`).join(" ");
  const gridY = [0, 0.25, 0.5, 0.75, 1].map((f) => padding.top + innerH * f);
  const usersTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxUsers * f));
  const actionsTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxActions * f));
  const labelEvery = Math.max(1, Math.ceil(points.length / (hourly ? 8 : 7)));
  const hover = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="relative">
      <div className="mb-3 flex items-center gap-4 text-xs font-medium" style={{ color: TEXT_SECONDARY }}>
        <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: CHART_LIME }} /> Utenti attivi</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: CHART_BLACK }} /> Azioni</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full touch-none" role="img" aria-label="Andamento nel tempo di utenti attivi e azioni"
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const relX = ((event.clientX - rect.left) / rect.width) * width;
          const i = points.length === 1 ? 0 : Math.round(((relX - padding.left) / innerW) * (points.length - 1));
          setHoverIndex(Math.min(Math.max(i, 0), points.length - 1));
        }}
      >
        {gridY.map((gy) => <line key={gy} x1={padding.left} x2={width - padding.right} y1={gy} y2={gy} stroke="rgba(23,27,24,.06)" strokeWidth={1} />)}
        {usersTicks.map((t, i) => <text key={`u${t}-${i}`} x={padding.left - 8} y={gridY[4 - i] + 3} fontSize={10} fill={TEXT_MUTED} textAnchor="end">{t}</text>)}
        {actionsTicks.map((t, i) => <text key={`a${t}-${i}`} x={width - padding.right + 8} y={gridY[4 - i] + 3} fontSize={10} fill={TEXT_MUTED} textAnchor="start">{t}</text>)}
        <path d={usersArea} fill={CHART_LIME} opacity={0.12} />
        <path d={usersLine} fill="none" stroke={CHART_LIME} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <path d={actionsLine} fill="none" stroke={CHART_BLACK} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.bucket}>
            <circle cx={x(i)} cy={yUsers(p.activeUsers)} r={i === hoverIndex ? 5 : 3.5} fill={CHART_LIME} stroke="#fff" strokeWidth={2} />
            <circle cx={x(i)} cy={yActions(p.actions)} r={i === hoverIndex ? 5 : 3.5} fill={CHART_BLACK} stroke="#fff" strokeWidth={2} />
            {i % labelEvery === 0 && <text x={x(i)} y={height - 8} fontSize={10} fill={TEXT_MUTED} textAnchor="middle">{formatBucket(p.bucket, hourly)}</text>}
            <rect x={x(i) - (innerW / points.length) / 2} y={padding.top} width={Math.max(innerW / points.length, 4)} height={innerH} fill="transparent" onMouseEnter={() => setHoverIndex(i)} />
          </g>
        ))}
        {hover && <line x1={x(hoverIndex!)} x2={x(hoverIndex!)} y1={padding.top} y2={padding.top + innerH} stroke="rgba(23,27,24,.18)" strokeWidth={1} />}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border bg-white px-3 py-2 text-xs shadow-lg"
          style={{ borderColor: BORDER, left: `${Math.min(Math.max((x(hoverIndex!) / width) * 100, 12), 88)}%`, top: 4, transform: "translateX(-50%)" }}
        >
          <p className="font-semibold" style={{ color: TEXT_PRIMARY }}>{formatBucket(hover.bucket, hourly)}</p>
          <p className="mt-1 flex items-center gap-1.5" style={{ color: TEXT_SECONDARY }}><i className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: CHART_LIME }} />Utenti attivi <b style={{ color: TEXT_PRIMARY }}>{hover.activeUsers}</b></p>
          <p className="flex items-center gap-1.5" style={{ color: TEXT_SECONDARY }}><i className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: CHART_BLACK }} />Azioni <b style={{ color: TEXT_PRIMARY }}>{hover.actions}</b></p>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------- live card
export function LiveCard({ onlineNow, byPlatform, clientLabel }: { onlineNow: number; byPlatform: { client_type: string; n: number }[]; clientLabel: (v: string) => string }) {
  const max = Math.max(...byPlatform.map((p) => p.n), 1);
  return (
    <Card
      title="In questo momento"
      action={<span className="flex items-center gap-1.5 rounded-full bg-[#e9ffd0] px-2.5 py-1 text-[11px] font-bold text-[#3a7d0e]"><i className="live-dot" style={{ background: "#3a7d0e" }} />Live</span>}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(124,179,5,.12)", color: "#3a7d0e" }}>
          <svg viewBox="0 0 20 20" fill="none" className="size-5" aria-hidden><circle cx="7" cy="6.5" r="2.3" stroke="currentColor" strokeWidth="1.5" /><circle cx="14" cy="7" r="1.9" stroke="currentColor" strokeWidth="1.5" /><path d="M2 16c.5-2.7 2.5-4.3 5-4.3s4.5 1.6 5 4.3M11.5 12.3c2 0 3.6 1.3 4 3.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </span>
        <p className="text-[2rem] font-bold leading-none" style={{ color: TEXT_PRIMARY }}>{onlineNow} <span className="text-base font-medium" style={{ color: TEXT_SECONDARY }}>utenti online</span></p>
      </div>
      <p className="mt-5 mb-2 text-xs font-semibold" style={{ color: TEXT_MUTED }}>Per piattaforma</p>
      {byPlatform.length === 0 ? (
        <EmptyState label="Nessun utente online al momento." />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {byPlatform.map((row) => (
            <li key={row.client_type} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs" style={{ color: TEXT_SECONDARY }}>{clientLabel(row.client_type)}</span>
              <span className="relative h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(23,27,24,.06)" }}>
                <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max((row.n / max) * 100, 4)}%`, background: CHART_LIME }} />
              </span>
              <span className="w-6 shrink-0 text-right text-xs font-semibold" style={{ color: TEXT_PRIMARY }}>{row.n}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// --------------------------------------------------------------- ranking
export type RankedItem = { key: string; label: string; value: number; icon: ReactNode };

export function RankedList({ items }: { items: RankedItem[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return <EmptyState label="Nessuna funzione utilizzata in questo periodo." />;
  const shown = expanded ? items : items.slice(0, 4);
  return (
    <div>
      <ul className="flex flex-col gap-1">
        {shown.map((item, index) => (
          <li key={item.key} className="flex items-center gap-3 rounded-xl px-1 py-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: index === 0 ? "#c8ff3d" : "rgba(23,27,24,.06)", color: index === 0 ? "#182400" : TEXT_SECONDARY }}>{index + 1}</span>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(23,27,24,.05)", color: TEXT_SECONDARY }}>{item.icon}</span>
            <span className="flex-1 truncate text-sm font-medium" style={{ color: TEXT_PRIMARY }}>{item.label}</span>
            <span className="text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>{item.value.toLocaleString("it-IT")}</span>
          </li>
        ))}
      </ul>
      {items.length > 4 && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-3 text-sm font-semibold" style={{ color: "#3a7d0e" }}>
          {expanded ? "Mostra meno ←" : "Vedi tutte le funzioni →"}
        </button>
      )}
    </div>
  );
}

// ----------------------------------------------------------------- funnel
export type FunnelStage = { key: string; label: string; value: number; icon: ReactNode };

export function FunnelSteps({ stages }: { stages: FunnelStage[] }) {
  const base = stages[0]?.value ?? 0;
  if (base === 0) return <EmptyState label="Nessuna visita registrata in questo periodo: il percorso non può ancora essere calcolato." />;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start">
      {stages.map((stage, index) => {
        const pct = Math.round((stage.value / base) * 100);
        return (
          <div key={stage.key} className="contents">
            {index > 0 && (
              <div className="flex justify-center py-1 sm:mt-5 sm:justify-center sm:py-0" style={{ color: TEXT_MUTED }} aria-hidden>
                <span className="sm:hidden">↓</span>
                <span className="hidden text-lg sm:block">→</span>
              </div>
            )}
            <div className="flex items-center gap-4 sm:flex-1 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(124,179,5,.12)", color: "#3a7d0e" }}>{stage.icon}</span>
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold sm:justify-center" style={{ color: TEXT_MUTED }}>
                  <span className="flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: TEXT_PRIMARY }}>{index + 1}</span>
                  {stage.label}
                </p>
                <p className="text-2xl font-bold leading-tight" style={{ color: "#3a7d0e" }}>{pct}%</p>
                <p className="text-xs" style={{ color: TEXT_MUTED }}>{stage.value.toLocaleString("it-IT")} utenti</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------- breakdown
export type BarItem = { key: string; label: string; value: number; pct: number };

export function BarBreakdown({ items, footerLabel, footerValue }: { items: BarItem[]; footerLabel?: string; footerValue?: number }) {
  if (!items.length) return <EmptyState label="Nessun dato disponibile per questo periodo." />;
  return (
    <div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium" style={{ color: TEXT_SECONDARY }}>{item.label}</span>
              <span style={{ color: TEXT_PRIMARY }}><b className="font-semibold">{item.value.toLocaleString("it-IT")}</b> <span style={{ color: TEXT_MUTED }}>{item.pct}%</span></span>
            </div>
            <span className="block h-2.5 overflow-hidden rounded-full" style={{ background: "rgba(23,27,24,.06)" }}>
              <span className="block h-full rounded-full" style={{ width: `${Math.max(item.pct, 2)}%`, background: CHART_LIME }} />
            </span>
          </li>
        ))}
      </ul>
      {footerLabel && (
        <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs" style={{ borderColor: BORDER }}>
          <span style={{ color: TEXT_MUTED }}>{footerLabel}</span>
          <span className="font-semibold" style={{ color: TEXT_PRIMARY }}>{footerValue?.toLocaleString("it-IT") ?? 0}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------- service status
export function ServiceStatusCard({ healthy, recentErrors, checkedAt, eventLabel }: { healthy: boolean; recentErrors: { event: string; n: number }[]; checkedAt: string; eventLabel: (e: string) => string }) {
  const time = new Date(checkedAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  return (
    <Card title="Stato del servizio">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full" style={{ background: healthy ? "rgba(124,179,5,.12)" : "rgba(220,38,38,.1)", color: healthy ? "#3a7d0e" : CHART_RED }}>
          {healthy ? (
            <svg viewBox="0 0 20 20" fill="none" className="size-5" aria-hidden><path d="m4 10.5 4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          ) : (
            <AlertTriangleIcon className="size-5" />
          )}
        </span>
        <div>
          <p className="text-base font-semibold" style={{ color: healthy ? "#3a7d0e" : CHART_RED }}>{healthy ? "Tutto funziona correttamente" : "Sono stati rilevati dei problemi"}</p>
          <p className="text-sm" style={{ color: TEXT_MUTED }}>{healthy ? "Tutti i sistemi operativi" : recentErrors.map((e) => `${eventLabel(e.event)} (${e.n})`).join(", ")}</p>
          <p className="mt-2 text-xs" style={{ color: TEXT_MUTED }}>Ultimo controllo: oggi, {time}</p>
        </div>
      </div>
    </Card>
  );
}
