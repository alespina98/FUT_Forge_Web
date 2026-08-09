"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "../i18n-provider";

const POSITIONS = ["GK", "CB", "LB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "CF", "ST"] as const;
const STAR_OPTIONS = ["1", "2", "3", "4", "5"] as const;
type AccelerateOption = "" | "EXPLOSIVE" | "LENGTHY" | "CONTROLLED";

type StatKey = "facePace" | "faceShooting" | "facePassing" | "faceDribbling" | "faceDefending" | "facePhysicality";
const STAT_KEYS: StatKey[] = ["facePace", "faceShooting", "facePassing", "faceDribbling", "faceDefending", "facePhysicality"];

type GradeSuccessEnvelope = { ok: true; data: { grade: number | null } };
type BackendErrorEnvelope = { ok: false; error: { code: string; message: string } };
type ApiError = { code: string; message: string };
type Status = "idle" | "loading" | "success" | "error";

function isGradeSuccess(value: unknown): value is GradeSuccessEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { ok?: unknown; data?: unknown };
  return v.ok === true && typeof v.data === "object" && v.data !== null && typeof (v.data as { grade?: unknown }).grade !== "undefined";
}

function isBackendError(value: unknown): value is BackendErrorEnvelope {
  return typeof value === "object" && value !== null && (value as { ok?: unknown }).ok === false;
}

function ErrorPanel({ title, message, code }: { title: string; message: string; code?: string }) {
  return (
    <div className="rounded-xl border border-red-500/25 bg-red-500/[.06] p-4" role="alert">
      <p className="text-sm font-semibold text-red-300">{title}</p>
      <p className="mt-1 text-sm text-white/60">{message}</p>
      {code && <p className="mt-2 font-mono text-[10px] uppercase tracking-[.12em] text-white/30">{code}</p>}
    </div>
  );
}

const fieldClass =
  "min-h-12 w-full rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm text-white placeholder:text-white/30 focus:border-lime/40 focus:outline-none";

export function GradeTool() {
  const { t } = useI18n();
  const p = t.app.grade;

  const [stats, setStats] = useState<Record<StatKey, string>>({
    facePace: "", faceShooting: "", facePassing: "", faceDribbling: "", faceDefending: "", facePhysicality: "",
  });
  const [position, setPosition] = useState("");
  const [skillMoves, setSkillMoves] = useState("");
  const [weakFoot, setWeakFoot] = useState("");
  const [accelerate, setAccelerate] = useState<AccelerateOption>("");

  const [status, setStatus] = useState<Status>("idle");
  const [grade, setGrade] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const statLabels: Record<StatKey, string> = {
    facePace: p.paceLabel, faceShooting: p.shootingLabel, facePassing: p.passingLabel,
    faceDribbling: p.dribblingLabel, faceDefending: p.defendingLabel, facePhysicality: p.physicalLabel,
  };

  async function submit(event: FormEvent) {
    event.preventDefault();

    const parsedStats: Record<StatKey, number> = {} as Record<StatKey, number>;
    for (const key of STAT_KEYS) {
      const n = Number(stats[key]);
      if (stats[key].trim() === "" || !Number.isFinite(n) || n < 0 || n > 99) {
        setStatus("error");
        setError({ code: "invalid_input", message: p.validationError });
        return;
      }
      parsedStats[key] = n;
    }

    setStatus("loading");
    setError(null);
    setGrade(null);

    const payload: Record<string, unknown> = { ...parsedStats };
    if (position) payload.position = position;
    if (skillMoves) payload.skillMoves = Number(skillMoves);
    if (weakFoot) payload.weakFoot = Number(weakFoot);
    if (accelerate) payload.accelerateType = accelerate;

    try {
      const response = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
      const body: unknown = await response.json().catch(() => null);
      if (isGradeSuccess(body) && typeof body.data.grade === "number") {
        setGrade(body.data.grade);
        setStatus("success");
        return;
      }
      setError({ code: isBackendError(body) ? body.error.code : "unexpected_response", message: p.genericError });
      setStatus("error");
    } catch {
      setError({ code: "network_error", message: p.networkError });
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="section-label">{p.eyebrow}</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-.04em] sm:text-5xl">{p.title}</h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-white/50">{p.lead}</p>

      <form onSubmit={submit} className="glass mt-8 flex flex-col gap-6 rounded-2xl p-6 sm:p-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-white/35">{p.statsHeading}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {STAT_KEYS.map((key) => (
              <label key={key} className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[.1em] text-white/40">{statLabels[key]}</span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  step={1}
                  inputMode="numeric"
                  value={stats[key]}
                  onChange={(event) => setStats((prev) => ({ ...prev, [key]: event.target.value }))}
                  className={fieldClass}
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.14em] text-white/35">{p.detailsHeading}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[.1em] text-white/40">{p.positionLabel}</span>
              <select value={position} onChange={(event) => setPosition(event.target.value)} className={fieldClass}>
                <option value="">{p.positionPlaceholder}</option>
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[.1em] text-white/40">{p.skillMovesLabel}</span>
              <select value={skillMoves} onChange={(event) => setSkillMoves(event.target.value)} className={fieldClass}>
                <option value="">—</option>
                {STAR_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}★</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[.1em] text-white/40">{p.weakFootLabel}</span>
              <select value={weakFoot} onChange={(event) => setWeakFoot(event.target.value)} className={fieldClass}>
                <option value="">—</option>
                {STAR_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}★</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[.1em] text-white/40">{p.accelerateLabel}</span>
              <select value={accelerate} onChange={(event) => setAccelerate(event.target.value as AccelerateOption)} className={fieldClass}>
                <option value="">{p.accelerateNone}</option>
                <option value="EXPLOSIVE">{p.accelerateExplosive}</option>
                <option value="LENGTHY">{p.accelerateLengthy}</option>
                <option value="CONTROLLED">{p.accelerateControlled}</option>
              </select>
            </label>
          </div>
        </div>

        <button type="submit" className="button-primary self-start" disabled={status === "loading"}>
          {status === "loading" ? p.submittingButton : p.submitButton}
        </button>
      </form>

      <div className="mt-6" aria-live="polite">
        {status === "idle" && <p className="text-sm text-white/40">{p.emptyState}</p>}

        {status === "error" && error && <ErrorPanel title={p.errorTitle} message={error.message} code={error.code} />}

        {status === "success" && grade !== null && (
          <div className="glass rounded-2xl p-6 sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[.12em] text-white/35">{p.resultLabel}</p>
            <p className="mt-1 text-3xl font-semibold text-lime">
              {grade.toFixed(1)} <span className="text-sm font-normal text-white/40">{p.outOf}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
