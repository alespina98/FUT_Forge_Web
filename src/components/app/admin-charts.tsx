"use client";

const GOOD = "#0ca30c";
const CRITICAL = "#e66767";
const MUTED = "#898781";
const SEQUENTIAL = "#3987e5";
const GRID = "#2c2c2a";

function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function DeltaBadge({ deltaPct, invert = false }: { deltaPct: number | null; invert?: boolean }) {
  if (deltaPct === null) return <span className="text-[11px] text-white/30">new</span>;
  const up = deltaPct > 0;
  const flat = deltaPct === 0;
  const good = flat ? null : invert ? !up : up;
  const color = flat ? MUTED : good ? GOOD : CRITICAL;
  const arrow = flat ? "→" : up ? "↑" : "↓";
  return (
    <span className="text-[11px] font-semibold" style={{ color }}>
      {arrow} {Math.abs(deltaPct)}%
    </span>
  );
}

export function KpiCard({ label, value, deltaPct, invert }: { label: string; value: number; deltaPct: number | null; invert?: boolean }) {
  return (
    <div className="glass rounded-2xl border px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-white/40">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-3xl font-semibold tracking-[-.02em]">{compactNumber(value)}</p>
        <DeltaBadge deltaPct={deltaPct} invert={invert} />
      </div>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <p className="py-6 text-center text-xs text-white/30">{label}</p>;
}

export type BarItem = { key: string; label: string; value: number; color?: string };

export function BarList({ items, unit }: { items: BarItem[]; unit?: string }) {
  if (!items.length) return <EmptyState label="No data yet." />;
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => {
        const pct = Math.max((item.value / max) * 100, 2);
        return (
          <li key={item.key} className="flex items-center gap-3">
            <span className="w-36 shrink-0 truncate text-xs text-white/60 sm:w-44" title={item.label}>{item.label}</span>
            <span className="relative h-4 flex-1 overflow-hidden rounded-full bg-white/[.04]">
              <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: item.color ?? SEQUENTIAL }} />
            </span>
            <span className="w-14 shrink-0 text-right text-xs font-semibold text-white/80">{compactNumber(item.value)}{unit ?? ""}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function Funnel({ stages }: { stages: { key: string; label: string; value: number }[] }) {
  const filtered = stages.filter((_, index) => index === 0 || stages[0].value > 0);
  if (!filtered.length || filtered[0].value === 0) return <EmptyState label="No visits recorded yet." />;
  const base = filtered[0].value;
  return (
    <ul className="flex flex-col gap-2.5">
      {filtered.map((stage, index) => {
        const pct = base ? Math.round((stage.value / base) * 100) : 0;
        const width = base ? Math.max((stage.value / base) * 100, stage.value > 0 ? 3 : 0) : 0;
        const retention = index === 0 ? null : filtered[index - 1].value ? Math.round((stage.value / filtered[index - 1].value) * 100) : 0;
        return (
          <li key={stage.key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-white/60">{stage.label}</span>
              <span className="text-white/80">
                <b className="font-semibold">{compactNumber(stage.value)}</b>
                <span className="ml-1.5 text-white/35">{pct}%{retention !== null && <> · {retention}% of prev.</>}</span>
              </span>
            </div>
            <span className="block h-3 overflow-hidden rounded-full bg-white/[.04]">
              <span className="block h-full rounded-full" style={{ width: `${width}%`, background: SEQUENTIAL }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export type TimeSeriesPoint = { bucket: string; events: number; active: number };

function formatBucket(bucket: string, hourly: boolean): string {
  const date = new Date(bucket.endsWith("Z") || bucket.includes("T") ? bucket : `${bucket}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return bucket;
  return hourly
    ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: undefined, hour12: false })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function TimeSeriesChart({ points, hourly }: { points: TimeSeriesPoint[]; hourly: boolean }) {
  if (points.length < 2) return <EmptyState label="Not enough data yet to chart a trend." />;
  const width = 640;
  const height = 180;
  const padding = { top: 10, right: 10, bottom: 24, left: 10 };
  const maxEvents = Math.max(...points.map((p) => p.events), 1);
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const x = (index: number) => padding.left + (points.length === 1 ? 0 : (index / (points.length - 1)) * innerW);
  const y = (value: number) => padding.top + innerH - (value / maxEvents) * innerH;
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.events).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${x(points.length - 1).toFixed(1)},${(padding.top + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padding.top + innerH).toFixed(1)} Z`;
  const activeLinePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.active).toFixed(1)}`).join(" ");
  const gridY = [0, 0.5, 1].map((f) => padding.top + innerH * f);
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-[11px] text-white/50">
        <span className="flex items-center gap-1.5"><i className="inline-block h-1.5 w-3 rounded-full" style={{ background: SEQUENTIAL }} /> Events</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-1.5 w-3 rounded-full" style={{ background: "#d95926" }} /> Active users</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Usage over time">
        {gridY.map((gy) => <line key={gy} x1={padding.left} x2={width - padding.right} y1={gy} y2={gy} stroke={GRID} strokeWidth={1} />)}
        <path d={areaPath} fill={SEQUENTIAL} opacity={0.1} />
        <path d={linePath} fill="none" stroke={SEQUENTIAL} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={activeLinePath} fill="none" stroke="#d95926" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={p.bucket}>
            <circle cx={x(i)} cy={y(p.events)} r={3} fill={SEQUENTIAL} stroke="#070908" strokeWidth={2}>
              <title>{`${formatBucket(p.bucket, hourly)}: ${p.events} events, ${p.active} active`}</title>
            </circle>
            {i % labelEvery === 0 && (
              <text x={x(i)} y={height - 6} fontSize={9} fill={MUTED} textAnchor="middle">{formatBucket(p.bucket, hourly)}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
