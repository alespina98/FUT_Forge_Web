"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminSelect } from "./admin-select";

type Summary = {
  ok: true;
  range: string;
  platform: string;
  eventsToday: number;
  totals: { events: number; active: number; authenticated: number };
  byPlatform: { client_type: string; events: number; active: number }[];
  byVersion: { client_type: string; version: string; installs: number }[];
  downloads: { event: string; n: number }[];
  authEvents: { event: string; n: number }[];
  errors: { event: string; n: number }[];
  features: { event: string; n: number }[];
  dau: number;
  wau: number;
  mau: number;
};

type Status = "loading" | "denied" | "loaded" | "error";

const RANGE_OPTIONS = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

const PLATFORM_OPTIONS = [
  { value: "all", label: "All platforms" },
  { value: "web", label: "Web" },
  { value: "desktop", label: "Desktop" },
  { value: "android", label: "Android" },
  { value: "bookmarklet", label: "Bookmarklet" },
  { value: "extension", label: "Extension" },
];

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass rounded-2xl border px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[.08em] text-white/40">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-.02em]">{value}</p>
    </div>
  );
}

function EventTable({ title, rows, labelKey, valueKey }: { title: string; rows: Record<string, string | number>[]; labelKey: string; valueKey: string }) {
  const total = rows.reduce((sum, row) => sum + Number(row[valueKey] ?? 0), 0);
  return (
    <div className="glass mt-6 rounded-2xl border p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[.08em] text-white/50">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-white/40">No data for this range.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {rows.map((row) => {
            const value = Number(row[valueKey] ?? 0);
            const pct = total ? Math.round((value / total) * 100) : 0;
            return (
              <li key={String(row[labelKey])} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-white/70">{String(row[labelKey])}</span>
                <span className="flex items-center gap-3">
                  <span className="text-white/40">{pct}%</span>
                  <span className="font-semibold">{value}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AdminAnalyticsDashboard() {
  const [status, setStatus] = useState<Status>("loading");
  const [range, setRange] = useState("24h");
  const [platform, setPlatform] = useState("all");
  const [data, setData] = useState<Summary | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    const params = new URLSearchParams({ range, platform });
    const response = await fetch(`/api/admin/analytics/summary?${params}`, { cache: "no-store" });
    if (!response.ok) {
      setStatus(response.status === 401 || response.status === 404 ? "denied" : "error");
      return;
    }
    const payload = (await response.json()) as Summary;
    setData(payload);
    setStatus("loaded");
  }, [range, platform]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "denied" || status === "error") {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="section-label">Admin</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-.04em]">Analytics unavailable</h1>
        <p className="mt-4 text-sm leading-6 text-white/50">You don&apos;t have access to this dashboard, or analytics storage isn&apos;t configured yet.</p>
      </div>
    );
  }

  const byVersionForPlatform = (clientType: string) => data?.byVersion.filter((row) => row.client_type === clientType) ?? [];

  return (
    <div className="admin-panel">
      <p className="section-label">Admin</p>
      <h1 className="mt-5 text-3xl font-semibold tracking-[-.04em]">Analytics</h1>

      <div className="mt-6 flex flex-wrap gap-3">
        <AdminSelect value={range} onChange={setRange} options={RANGE_OPTIONS} className="min-w-[120px]" />
        <AdminSelect value={platform} onChange={setPlatform} options={PLATFORM_OPTIONS} className="min-w-[170px]" />
      </div>

      {status === "loading" && !data ? (
        <p className="mt-8 text-sm text-white/40">Loading…</p>
      ) : data ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Events today" value={data.eventsToday} />
            <StatTile label={`Events (${range})`} value={data.totals.events} />
            <StatTile label="Active users" value={data.totals.active} />
            <StatTile label="Authenticated" value={data.totals.authenticated} />
            <StatTile label="Anonymous" value={Math.max(0, data.totals.active - data.totals.authenticated)} />
            <StatTile label="DAU / WAU / MAU" value={`${data.dau} / ${data.wau} / ${data.mau}`} />
          </div>

          <EventTable title="Platform breakdown" rows={data.byPlatform} labelKey="client_type" valueKey="active" />

          <div className="glass mt-6 rounded-2xl border p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[.08em] text-white/50">Version adoption</h2>
            {PLATFORM_OPTIONS.filter((p) => p.value !== "all").map((p) => {
              const rows = byVersionForPlatform(p.value);
              if (!rows.length) return null;
              const total = rows.reduce((sum, row) => sum + row.installs, 0);
              return (
                <div key={p.value} className="mt-4 first:mt-0">
                  <p className="text-xs font-semibold uppercase tracking-[.08em] text-white/40">{p.label}</p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {rows.map((row) => (
                      <li key={row.version} className="flex items-center justify-between text-sm">
                        <span className="text-white/70">{row.version}</span>
                        <span className="flex items-center gap-3">
                          <span className="text-white/40">{total ? Math.round((row.installs / total) * 100) : 0}%</span>
                          <span className="font-semibold">{row.installs}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <EventTable title="Downloads" rows={data.downloads} labelKey="event" valueKey="n" />
          <EventTable title="Login / signup" rows={data.authEvents} labelKey="event" valueKey="n" />
          <EventTable title="Feature usage (SBC, EVO, Squad Builder, Share Squad, Bookmarklet)" rows={data.features} labelKey="event" valueKey="n" />
          <EventTable title="Errors" rows={data.errors} labelKey="event" valueKey="n" />
        </>
      ) : null}
    </div>
  );
}
