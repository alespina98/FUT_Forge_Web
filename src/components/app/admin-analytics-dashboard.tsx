"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AdminSelect } from "./admin-select";
import {
  Card, KpiCard, TimeSeriesChart, LiveCard, RankedList, FunnelSteps, BarBreakdown, ServiceStatusCard, EmptyState,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, BORDER,
  type TimeSeriesPoint, type RankedItem, type FunnelStage, type BarItem,
} from "./admin-charts";
import { eventLabel, eventIconKey, clientLabel, clientIconKey, isUnknownVersion } from "@/lib/analytics/labels";
import {
  UserIcon, RegisterIcon, BoltIcon, AlertTriangleIcon, EyeIcon, SearchIcon, TargetIcon, StarIcon, ShareIcon,
  ToolsIcon, CheckIcon, RouteIcon, BookmarkIcon, WindowsIcon, AndroidIcon, GlobeIcon, DevicesIcon,
} from "@/components/icons";

function iconFor(key: string, className = "size-4"): ReactNode {
  switch (key) {
    case "eye": return <EyeIcon className={className} />;
    case "search": return <SearchIcon className={className} />;
    case "target": return <TargetIcon className={className} />;
    case "star": return <StarIcon className={className} />;
    case "share": return <ShareIcon className={className} />;
    case "tools": return <ToolsIcon className={className} />;
    case "check": return <CheckIcon className={className} />;
    case "alert": return <AlertTriangleIcon className={className} />;
    case "route": return <RouteIcon className={className} />;
    case "bookmark": return <BookmarkIcon className={className} />;
    case "windows": return <WindowsIcon className={className} />;
    case "android": return <AndroidIcon className={className} />;
    case "globe": return <GlobeIcon className={className} />;
    case "devices": return <DevicesIcon className={className} />;
    default: return <BoltIcon className={className} />;
  }
}

// This dashboard is always the light FUT Forge palette, independent of the
// site-wide dark/light toggle the rest of the app respects - restores
// whatever the page had on unmount rather than persisting anything.
function useForceLightTheme() {
  useEffect(() => {
    const html = document.documentElement;
    const prevTheme = html.dataset.theme;
    const prevPreference = html.dataset.themePreference;
    const prevColorScheme = html.style.colorScheme;
    html.dataset.theme = "light";
    html.dataset.themePreference = "light";
    html.style.colorScheme = "light";
    return () => {
      if (prevTheme === undefined) delete html.dataset.theme; else html.dataset.theme = prevTheme;
      if (prevPreference === undefined) delete html.dataset.themePreference; else html.dataset.themePreference = prevPreference;
      html.style.colorScheme = prevColorScheme;
    };
  }, []);
}

type Kpi = { value: number; previous: number; delta: number };
type Summary = {
  ok: true;
  range: string; rangeLabel: string; comparisonLabel: string;
  since: number; until: number; bucketGranularity: "hour" | "day";
  platform: string; auth: string; availablePlatforms: string[];
  kpis: { activeUsers: Kpi; newSignups: Kpi; actionsExecuted: Kpi; errors: Kpi };
  timeSeries: TimeSeriesPoint[];
  live: { onlineNow: number; byPlatform: { client_type: string; n: number }[] };
  features: { event: string; n: number }[];
  funnel: { visits: number; loginOrSignup: number; downloads: number; featureUsage: number };
  serviceStatus: { healthy: boolean; recentErrors: { event: string; n: number }[]; checkedAt: string };
  downloads: { event: string; n: number }[];
  versions: { client_type: string; version: string; n: number }[];
  errorsDetailed: { client_type: string; event: string; feature: string; n: number }[];
  detail: { event: string; client_type: string; version: string; n: number }[];
};

type Status = "loading" | "denied" | "error" | "loaded";

const RANGE_OPTIONS = [
  { value: "today", label: "Oggi" },
  { value: "7d", label: "7 giorni" },
  { value: "30d", label: "30 giorni" },
];

const PLATFORM_OPTIONS = [
  { value: "all", label: "Tutte le piattaforme" },
  { value: "web", label: "Web" },
  { value: "desktop", label: "Desktop" },
  { value: "android", label: "Android" },
  { value: "bookmarklet", label: "Bookmarklet" },
  { value: "extension", label: "Estensione" },
];

const AUTH_OPTIONS = [
  { value: "all", label: "Tutti gli utenti" },
  { value: "authenticated", label: "Autenticati" },
  { value: "anonymous", label: "Anonimi" },
];

function CalendarIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden><rect x="3" y="4.5" width="14" height="12" rx="1.6" stroke="currentColor" strokeWidth="1.4" /><path d="M3 8h14M6.5 3v3M13.5 3v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
}

function toDateInputValue(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function AdminAnalyticsDashboard() {
  useForceLightTheme();

  const [status, setStatus] = useState<Status>("loading");
  const [range, setRange] = useState("today");
  const [customFrom, setCustomFrom] = useState<string>(toDateInputValue(Date.now() - 7 * 86400000));
  const [customTo, setCustomTo] = useState<string>(toDateInputValue(Date.now()));
  const [platform, setPlatform] = useState("all");
  const [authFilter, setAuthFilter] = useState("all");
  const [data, setData] = useState<Summary | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const load = useCallback(async () => {
    setStatus((current) => (current === "loaded" ? current : "loading"));
    const params = new URLSearchParams({ range, platform, auth: authFilter });
    if (range === "custom") {
      params.set("from", String(new Date(`${customFrom}T00:00:00.000Z`).getTime()));
      params.set("to", String(new Date(`${customTo}T23:59:59.999Z`).getTime()));
    }
    const response = await fetch(`/api/admin/analytics/summary?${params}`, { cache: "no-store" });
    if (!response.ok) {
      setStatus(response.status === 401 || response.status === 404 ? "denied" : "error");
      return;
    }
    const payload = (await response.json()) as Summary;
    setData(payload);
    setStatus("loaded");
  }, [range, platform, authFilter, customFrom, customTo]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "denied" || status === "error") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold" style={{ color: TEXT_PRIMARY }}>Analytics non disponibile</h1>
        <p className="mt-3 text-sm" style={{ color: TEXT_SECONDARY }}>
          {status === "denied" ? "Non hai accesso a questa pagina, oppure devi accedere di nuovo." : "Si è verificato un problema nel caricamento dei dati. Riprova tra qualche istante."}
        </p>
      </div>
    );
  }

  const featureItems: RankedItem[] = (data?.features ?? []).filter((f) => f.n > 0).map((f) => ({ key: f.event, label: eventLabel(f.event), value: f.n, icon: iconFor(eventIconKey(f.event)) }));

  const downloadTotal = (data?.downloads ?? []).reduce((sum, d) => sum + d.n, 0);
  const downloadItems: BarItem[] = (data?.downloads ?? []).filter((d) => d.n > 0).map((d) => ({
    key: d.event,
    label: d.event === "desktop_download" ? "Desktop" : d.event === "android_download" ? "Android" : "Bookmarklet",
    value: d.n,
    pct: downloadTotal ? Math.round((d.n / downloadTotal) * 100) : 0,
  }));

  const versionsByPlatform = new Map<string, { client_type: string; version: string; n: number }[]>();
  for (const row of data?.versions ?? []) {
    if (!versionsByPlatform.has(row.client_type)) versionsByPlatform.set(row.client_type, []);
    versionsByPlatform.get(row.client_type)!.push(row);
  }
  const totalDevices = (data?.versions ?? []).reduce((sum, v) => sum + v.n, 0);

  const funnelStages: FunnelStage[] = data
    ? [
        { key: "visits", label: "Visitano", value: data.funnel.visits, icon: <UserIcon className="size-5" /> },
        { key: "auth", label: "Accedono", value: data.funnel.loginOrSignup, icon: <RegisterIcon className="size-5" /> },
        { key: "downloads", label: "Scaricano", value: data.funnel.downloads, icon: <svg viewBox="0 0 20 20" fill="none" className="size-5" aria-hidden><path d="M10 3v10m0 0 4-4m-4 4L6 9M4 17h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg> },
        { key: "feature", label: "Usano una funzione", value: data.funnel.featureUsage, icon: <StarIcon className="size-5" /> },
      ]
    : [];

  return (
    <div className="min-h-screen" style={{ background: "#f6f7f2" }}>
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: TEXT_PRIMARY }}>Panoramica</h1>
            <p className="mt-1 text-sm" style={{ color: TEXT_SECONDARY }}>Scopri in pochi secondi come viene usato FUT Forge</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-full border bg-white p-1" style={{ borderColor: BORDER }}>
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRange(option.value)}
                  className="rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
                  style={range === option.value ? { background: "#c8ff3d", color: "#182400" } : { color: TEXT_SECONDARY }}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRange("custom")}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors"
                style={range === "custom" ? { background: "#c8ff3d", color: "#182400" } : { color: TEXT_SECONDARY }}
              >
                Personalizzato <CalendarIcon className="size-3.5" />
              </button>
            </div>
            <AdminSelect value={platform} onChange={setPlatform} options={PLATFORM_OPTIONS} className="min-w-[168px]" />
            <AdminSelect value={authFilter} onChange={setAuthFilter} options={AUTH_OPTIONS} className="min-w-[150px]" />
          </div>
        </div>

        {range === "custom" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3" style={{ borderColor: BORDER }}>
            <label className="flex items-center gap-2 text-xs font-medium" style={{ color: TEXT_SECONDARY }}>
              Dal
              <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border px-2 py-1 text-sm" style={{ borderColor: BORDER, color: TEXT_PRIMARY }} />
            </label>
            <label className="flex items-center gap-2 text-xs font-medium" style={{ color: TEXT_SECONDARY }}>
              Al
              <input type="date" value={customTo} min={customFrom} max={toDateInputValue(Date.now())} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border px-2 py-1 text-sm" style={{ borderColor: BORDER, color: TEXT_PRIMARY }} />
            </label>
            <button type="button" onClick={load} className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "#c8ff3d", color: "#182400" }}>Applica</button>
          </div>
        )}

        {status === "loading" && !data ? (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" style={{ border: `1px solid ${BORDER}` }} />)}
          </div>
        ) : data ? (
          <div className="mt-6 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard icon={<UserIcon className="size-5" />} label="Utenti attivi" value={data.kpis.activeUsers.value} delta={data.kpis.activeUsers.delta} comparisonLabel={data.comparisonLabel} />
              <KpiCard icon={<RegisterIcon className="size-5" />} label="Nuovi iscritti" value={data.kpis.newSignups.value} delta={data.kpis.newSignups.delta} comparisonLabel={data.comparisonLabel} />
              <KpiCard icon={<BoltIcon className="size-5" />} label="Azioni eseguite" value={data.kpis.actionsExecuted.value} delta={data.kpis.actionsExecuted.delta} comparisonLabel={data.comparisonLabel} />
              <KpiCard icon={<AlertTriangleIcon className="size-5" />} label="Errori" value={data.kpis.errors.value} delta={data.kpis.errors.delta} comparisonLabel={data.comparisonLabel} invert />
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <Card title="Cosa sta succedendo?">
                <TimeSeriesChart points={data.timeSeries} hourly={data.bucketGranularity === "hour"} />
              </Card>
              <LiveCard onlineNow={data.live.onlineNow} byPlatform={data.live.byPlatform} clientLabel={clientLabel} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card title="Funzioni più usate">
                <RankedList items={featureItems} />
              </Card>
              <Card title="Dal primo accesso all'utilizzo" subtitle="Ogni fase conta chi ha compiuto quell'azione nel periodo (non solo chi arriva dalla fase precedente) - per questo un utente già registrato può risultare in “Usano una funzione” anche senza un nuovo accesso oggi.">
                <FunnelSteps stages={funnelStages} />
              </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <ServiceStatusCard healthy={data.serviceStatus.healthy} recentErrors={data.serviceStatus.recentErrors} checkedAt={data.serviceStatus.checkedAt} eventLabel={eventLabel} />
              <Card title="Download per piattaforma">
                <BarBreakdown items={downloadItems} footerLabel="Totale download nel periodo" footerValue={downloadTotal} />
              </Card>
              <Card title="Versioni in uso">
                {versionsByPlatform.size === 0 ? (
                  <EmptyState label="Nessun dato disponibile per questo periodo." />
                ) : (
                  <div className="flex flex-col gap-4">
                    {[...versionsByPlatform.entries()].map(([clientType, rows]) => {
                      const total = rows.reduce((sum, r) => sum + r.n, 0) || 1;
                      const items: BarItem[] = rows.map((r) => ({
                        key: r.version,
                        label: isUnknownVersion(r.version) ? "Versione non rilevata" : r.version,
                        value: r.n,
                        pct: Math.round((r.n / total) * 100),
                      }));
                      return (
                        <div key={clientType}>
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{iconFor(clientIconKey(clientType), "size-3.5")}{clientLabel(clientType)}</p>
                          <BarBreakdown items={items} />
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between border-t pt-3 text-xs" style={{ borderColor: BORDER }}>
                      <span style={{ color: TEXT_MUTED }}>Dispositivi totali</span>
                      <span className="font-semibold" style={{ color: TEXT_PRIMARY }}>{totalDevices}</span>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            <div className="rounded-2xl border bg-white" style={{ borderColor: BORDER }}>
              <button type="button" onClick={() => setShowDetail((v) => !v)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6">
                <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: TEXT_PRIMARY }}>
                  <svg viewBox="0 0 20 20" fill="none" className="size-4" style={{ color: TEXT_MUTED }} aria-hidden><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" /><path d="M10 6.5v4l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                  Dettagli tecnici
                </span>
                <svg viewBox="0 0 20 20" fill="none" className={`size-4 transition-transform ${showDetail ? "rotate-180" : ""}`} style={{ color: TEXT_MUTED }} aria-hidden><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {showDetail && (
                <div className="border-t px-5 pb-5 pt-4 sm:px-6" style={{ borderColor: BORDER }}>
                  <p className="mb-4 text-xs" style={{ color: TEXT_MUTED }}>
                    Le versioni indicate come &quot;Versione non rilevata&quot; corrispondono a eventi web (il sito è sempre aggiornato all&apos;ultima versione pubblicata, non invia un numero di versione) o a client meno recenti che non riportano ancora questo dato.
                  </p>
                  {data.errorsDetailed.length > 0 && (
                    <div className="mb-6">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Errori per piattaforma / funzione</p>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px] text-left text-xs">
                          <thead>
                            <tr className="border-b" style={{ borderColor: BORDER, color: TEXT_MUTED }}>
                              <th className="py-2 pr-3 font-semibold">Piattaforma</th>
                              <th className="py-2 pr-3 font-semibold">Tipo</th>
                              <th className="py-2 pr-3 font-semibold">Funzione</th>
                              <th className="py-2 text-right font-semibold">Conteggio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.errorsDetailed.map((row) => (
                              <tr key={`${row.client_type}-${row.event}-${row.feature}`} className="border-b last:border-0" style={{ borderColor: BORDER }}>
                                <td className="py-1.5 pr-3" style={{ color: TEXT_SECONDARY }}>{clientLabel(row.client_type)}</td>
                                <td className="py-1.5 pr-3" style={{ color: TEXT_SECONDARY }}>{eventLabel(row.event)}</td>
                                <td className="py-1.5 pr-3" style={{ color: TEXT_MUTED }}>{row.feature || "—"}</td>
                                <td className="py-1.5 text-right font-semibold" style={{ color: TEXT_PRIMARY }}>{row.n}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Eventi grezzi (evento / piattaforma / versione)</p>
                  {data.detail.length === 0 ? <EmptyState label="Nessun evento in questo periodo." /> : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left text-xs">
                        <thead>
                          <tr className="border-b" style={{ borderColor: BORDER, color: TEXT_MUTED }}>
                            <th className="py-2 pr-3 font-semibold">Evento</th>
                            <th className="py-2 pr-3 font-semibold">Piattaforma</th>
                            <th className="py-2 pr-3 font-semibold">Versione</th>
                            <th className="py-2 text-right font-semibold">Conteggio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.detail.map((row) => (
                            <tr key={`${row.event}-${row.client_type}-${row.version}`} className="border-b last:border-0" style={{ borderColor: BORDER }}>
                              <td className="py-1.5 pr-3 font-mono text-[11px]" style={{ color: TEXT_SECONDARY }}>{row.event}</td>
                              <td className="py-1.5 pr-3" style={{ color: TEXT_SECONDARY }}>{clientLabel(row.client_type)}</td>
                              <td className="py-1.5 pr-3" style={{ color: TEXT_MUTED }}>{isUnknownVersion(row.version) ? "Versione non rilevata" : row.version}</td>
                              <td className="py-1.5 text-right font-semibold" style={{ color: TEXT_PRIMARY }}>{row.n}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
