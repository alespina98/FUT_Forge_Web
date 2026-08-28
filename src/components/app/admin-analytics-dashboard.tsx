"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminSelect } from "./admin-select";
import { BarList, EmptyState, Funnel, KpiCard, TimeSeriesChart, type BarItem } from "./admin-charts";
import { eventLabel, clientLabel, clientColor } from "@/lib/analytics/labels";

type Kpi = { value: number; previous: number; deltaPct: number | null };

type Summary = {
  ok: true;
  range: string;
  platform: string;
  auth: string;
  kpis: {
    eventsToday: Kpi; activeUsers: Kpi; newSignups: Kpi; downloads: Kpi;
    autoBuilds: Kpi; sharedSquads: Kpi; errors: Kpi;
  };
  totals: { events: number; active: number; authenticated: number };
  byPlatform: { client_type: string; events: number; active: number }[];
  byVersion: { client_type: string; version: string; installs: number }[];
  downloads: { event: string; n: number }[];
  errors: { event: string; n: number }[];
  errorsDetailed: { client_type: string; event: string; feature: string; n: number }[];
  features: { event: string; n: number }[];
  timeSeries: { bucket: string; events: number; active: number }[];
  funnel: { visits: number; loginOrSignup: number; downloads: number; featureUsage: number };
  detail: { event: string; client_type: string; version: string; n: number }[];
  dau: number; wau: number; mau: number;
};

type Status = "loading" | "denied" | "loaded" | "error";

const RANGE_OPTIONS = [
  { value: "24h", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

const PLATFORM_OPTIONS = [
  { value: "all", label: "All platforms" },
  { value: "web", label: "Web" },
  { value: "desktop", label: "Desktop" },
  { value: "android", label: "Android" },
  { value: "bookmarklet", label: "Bookmarklet" },
  { value: "extension", label: "Extension" },
];

const AUTH_OPTIONS = [
  { value: "all", label: "All users" },
  { value: "authenticated", label: "Authenticated" },
  { value: "anonymous", label: "Anonymous" },
];

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl border p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[.08em] text-white/50">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[11px] text-white/30">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function AdminAnalyticsDashboard() {
  const [status, setStatus] = useState<Status>("loading");
  const [range, setRange] = useState("24h");
  const [platform, setPlatform] = useState("all");
  const [authFilter, setAuthFilter] = useState("all");
  const [showDetail, setShowDetail] = useState(false);
  const [data, setData] = useState<Summary | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    const params = new URLSearchParams({ range, platform, auth: authFilter });
    const response = await fetch(`/api/admin/analytics/summary?${params}`, { cache: "no-store" });
    if (!response.ok) {
      setStatus(response.status === 401 || response.status === 404 ? "denied" : "error");
      return;
    }
    const payload = (await response.json()) as Summary;
    setData(payload);
    setStatus("loaded");
  }, [range, platform, authFilter]);

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

  const toBarItems = (rows: { event: string; n: number }[], color?: (event: string) => string): BarItem[] =>
    rows.filter((row) => row.n > 0).map((row) => ({ key: row.event, label: eventLabel(row.event), value: row.n, color: color?.(row.event) }));

  const platformItems: BarItem[] = data?.byPlatform.filter((row) => row.active > 0).map((row) => ({
    key: row.client_type, label: clientLabel(row.client_type), value: row.active, color: clientColor(row.client_type),
  })) ?? [];

  const downloadItems: BarItem[] = data
    ? toBarItems(data.downloads, (event) => clientColor(event === "desktop_download" ? "desktop" : event === "android_download" ? "android" : "bookmarklet"))
    : [];

  const featureItems: BarItem[] = data ? toBarItems(data.features) : [];

  const errorItems: BarItem[] = data ? toBarItems(data.errors, () => "#e66767") : [];

  const versionGroups = data
    ? PLATFORM_OPTIONS.filter((p) => p.value !== "all")
        .map((p) => ({ platform: p, rows: data.byVersion.filter((row) => row.client_type === p.value) }))
        .filter((group) => group.rows.length > 0)
    : [];

  const hasTimeSeriesData = (data?.timeSeries ?? []).some((point) => point.events > 0);
  const hasErrors = (data?.errors ?? []).some((row) => row.n > 0);

  return (
    <div className="admin-panel">
      <p className="section-label">Admin</p>
      <h1 className="mt-5 text-3xl font-semibold tracking-[-.04em]">Analytics</h1>
      <p className="mt-1 text-sm text-white/40">How FUT Forge is actually being used, at a glance.</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <AdminSelect value={range} onChange={setRange} options={RANGE_OPTIONS} className="min-w-[120px]" />
        <AdminSelect value={platform} onChange={setPlatform} options={PLATFORM_OPTIONS} className="min-w-[170px]" />
        <AdminSelect value={authFilter} onChange={setAuthFilter} options={AUTH_OPTIONS} className="min-w-[150px]" />
      </div>

      {status === "loading" && !data ? (
        <p className="mt-8 text-sm text-white/40">Loading…</p>
      ) : data ? (
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            <KpiCard label="Active users" value={data.kpis.activeUsers.value} deltaPct={data.kpis.activeUsers.deltaPct} />
            <KpiCard label="Events today" value={data.kpis.eventsToday.value} deltaPct={data.kpis.eventsToday.deltaPct} />
            <KpiCard label="New signups" value={data.kpis.newSignups.value} deltaPct={data.kpis.newSignups.deltaPct} />
            <KpiCard label="Downloads" value={data.kpis.downloads.value} deltaPct={data.kpis.downloads.deltaPct} />
            <KpiCard label="Auto Builds" value={data.kpis.autoBuilds.value} deltaPct={data.kpis.autoBuilds.deltaPct} />
            <KpiCard label="Shared squads" value={data.kpis.sharedSquads.value} deltaPct={data.kpis.sharedSquads.deltaPct} />
            <KpiCard label="Errors" value={data.kpis.errors.value} deltaPct={data.kpis.errors.deltaPct} invert />
          </div>

          <Section title="Usage over time" subtitle={`DAU ${data.dau} · WAU ${data.wau} · MAU ${data.mau}`}>
            {hasTimeSeriesData ? <TimeSeriesChart points={data.timeSeries} hourly={range === "24h"} /> : <EmptyState label="No usage recorded in this range yet." />}
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Platform usage">
              <BarList items={platformItems} />
            </Section>
            <Section title="Feature usage">
              <BarList items={featureItems} />
            </Section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Version adoption">
              {versionGroups.length === 0 ? (
                <EmptyState label="No version data yet." />
              ) : (
                <div className="flex flex-col gap-4">
                  {versionGroups.map((group) => (
                    <div key={group.platform.value}>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.08em] text-white/40">{group.platform.label}</p>
                      <BarList items={group.rows.map((row) => ({ key: row.version, label: row.version, value: row.installs, color: clientColor(group.platform.value) }))} />
                    </div>
                  ))}
                </div>
              )}
            </Section>
            <Section title="Downloads by platform">
              <BarList items={downloadItems} />
            </Section>
          </div>

          <Section title="Auth funnel" subtitle="Visits, logins/signups, downloads and feature usage in this range (independent stage counts, not a strict per-user path).">
            <Funnel
              stages={[
                { key: "visits", label: "Visits", value: data.funnel.visits },
                { key: "auth", label: "Logged in / signed up", value: data.funnel.loginOrSignup },
                { key: "downloads", label: "Downloaded a client", value: data.funnel.downloads },
                { key: "feature", label: "Used a product feature", value: data.funnel.featureUsage },
              ]}
            />
          </Section>

          <Section title="Errors" subtitle={hasErrors ? "By type - see the technical table below for platform/version/feature breakdown." : undefined}>
            {hasErrors ? <BarList items={errorItems} /> : <p className="py-2 text-sm text-white/40">No errors recorded in this range. 🎉</p>}
            {data.errorsDetailed.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40">
                      <th className="py-2 pr-3 font-semibold">Platform</th>
                      <th className="py-2 pr-3 font-semibold">Type</th>
                      <th className="py-2 pr-3 font-semibold">Feature</th>
                      <th className="py-2 text-right font-semibold">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.errorsDetailed.map((row) => (
                      <tr key={`${row.client_type}-${row.event}-${row.feature}`} className="border-b border-white/5 last:border-0">
                        <td className="py-1.5 pr-3 text-white/70">{clientLabel(row.client_type)}</td>
                        <td className="py-1.5 pr-3 text-white/70">{eventLabel(row.event)}</td>
                        <td className="py-1.5 pr-3 text-white/50">{row.feature || "—"}</td>
                        <td className="py-1.5 text-right font-semibold">{row.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <div className="glass rounded-2xl border p-5">
            <button type="button" onClick={() => setShowDetail((v) => !v)} className="flex w-full items-center justify-between text-left">
              <span>
                <span className="text-sm font-semibold uppercase tracking-[.08em] text-white/50">Technical detail</span>
                <span className="ml-2 text-[11px] text-white/30">raw event / platform / version breakdown</span>
              </span>
              <span className="text-white/40">{showDetail ? "Hide −" : "Show +"}</span>
            </button>
            {showDetail && (
              <div className="mt-4 overflow-x-auto">
                {data.detail.length === 0 ? <EmptyState label="No events in this range." /> : (
                  <table className="w-full min-w-[560px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40">
                        <th className="py-2 pr-3 font-semibold">Event</th>
                        <th className="py-2 pr-3 font-semibold">Platform</th>
                        <th className="py-2 pr-3 font-semibold">Version</th>
                        <th className="py-2 text-right font-semibold">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.detail.map((row) => (
                        <tr key={`${row.event}-${row.client_type}-${row.version}`} className="border-b border-white/5 last:border-0">
                          <td className="py-1.5 pr-3 font-mono text-[11px] text-white/60">{row.event}</td>
                          <td className="py-1.5 pr-3 text-white/70">{clientLabel(row.client_type)}</td>
                          <td className="py-1.5 pr-3 text-white/50">{row.version}</td>
                          <td className="py-1.5 text-right font-semibold">{row.n}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
