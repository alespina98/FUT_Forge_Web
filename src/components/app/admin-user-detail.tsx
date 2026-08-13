"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "../i18n-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/use-auth-user";
import { FEATURE_IDS, FEATURE_LABELS, type FeatureId, type OverrideState } from "@/lib/entitlements";
import { AdminSelect } from "./admin-select";

type UserDetail = {
  id: string;
  email: string;
  username: string | null;
  role: "USER" | "ADMIN";
  tier: "FREE" | "PREMIUM";
  created_at: string;
};

type PageStatus = "loading" | "denied" | "loaded";
type SaveState = "idle" | "saving" | "saved" | "error";

export function AdminUserDetail({ userId }: { userId: string }) {
  const { t, locale } = useI18n();
  const a = t.admin;
  const { status: authStatus } = useAuthUser();

  const [status, setStatus] = useState<PageStatus>("loading");
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [overrides, setOverrides] = useState<Partial<Record<FeatureId, boolean>>>({});
  const [roleSave, setRoleSave] = useState<SaveState>("idle");
  const [tierSave, setTierSave] = useState<SaveState>("idle");
  const [roleError, setRoleError] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<"USER" | "ADMIN" | null>(null);
  const [featureSave, setFeatureSave] = useState<Partial<Record<FeatureId, SaveState>>>({});

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: detailRows, error: detailError } = await supabase.rpc("admin_get_user_detail", { p_target_id: userId });
    if (detailError || !detailRows || detailRows.length === 0) {
      setStatus("denied");
      return;
    }
    setDetail(detailRows[0] as UserDetail);

    const { data: overrideRows } = await supabase.from("entitlement_overrides").select("feature_id, enabled").eq("user_id", userId);
    const map: Partial<Record<FeatureId, boolean>> = {};
    for (const row of overrideRows || []) map[row.feature_id as FeatureId] = row.enabled as boolean;
    setOverrides(map);
    setStatus("loaded");
  }, [userId]);

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus === "signedOut") {
      setStatus("denied");
      return;
    }
    load();
  }, [authStatus, load]);

  async function applyRoleChange(newRole: "USER" | "ADMIN") {
    if (!detail) return;
    setRoleError(null);
    setRoleSave("saving");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("admin_set_user_role", { p_target_id: detail.id, p_new_role: newRole });
    if (error) {
      setRoleSave("error");
      setRoleError(error.message.includes("last remaining admin") ? a.lastAdminError : a.changeError);
      return;
    }
    setDetail({ ...detail, role: newRole });
    setRoleSave("saved");
  }

  function handleRoleSelect(newRole: "USER" | "ADMIN") {
    if (!detail || newRole === detail.role) return;
    // Confirm before touching ADMIN either direction, per the "avoid accidental
    // admin role changes" requirement.
    if (newRole === "ADMIN" || detail.role === "ADMIN") {
      setPendingRole(newRole);
      return;
    }
    applyRoleChange(newRole);
  }

  async function handleTierSelect(newTier: "FREE" | "PREMIUM") {
    if (!detail || newTier === detail.tier) return;
    setTierSave("saving");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("admin_set_user_tier", { p_target_id: detail.id, p_new_tier: newTier });
    if (error) {
      setTierSave("error");
      return;
    }
    setDetail({ ...detail, tier: newTier });
    setTierSave("saved");
  }

  async function handleFeatureState(feature: FeatureId, state: OverrideState) {
    if (!detail) return;
    setFeatureSave((prev) => ({ ...prev, [feature]: "saving" }));
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.rpc("admin_set_entitlement_override", { p_target_id: detail.id, p_feature_id: feature, p_state: state });
    if (error) {
      setFeatureSave((prev) => ({ ...prev, [feature]: "error" }));
      return;
    }
    setOverrides((prev) => {
      const next = { ...prev };
      if (state === "DEFAULT") delete next[feature];
      else next[feature] = state === "ENABLED";
      return next;
    });
    setFeatureSave((prev) => ({ ...prev, [feature]: "saved" }));
  }

  if (status === "loading") return null;

  if (status === "denied" || !detail) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="section-label">{a.title}</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-.04em]">{a.accessDeniedTitle}</h1>
        <p className="mt-4 text-sm leading-6 text-white/50">{a.accessDeniedBody}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/app/admin" className="block text-xs font-semibold text-white/40 hover:text-lime">
        ← {a.backToUsers}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-[-.04em]">{detail.username || detail.email}</h1>

      <div className="glass mt-6 grid grid-cols-1 gap-5 rounded-2xl p-6 sm:grid-cols-2 sm:p-8">
        <Field label={a.fieldUsername} value={detail.username || "—"} />
        <Field label={a.fieldEmail} value={detail.email} />
        <Field label={a.fieldUserId} value={detail.id} mono />
        <Field label={a.fieldStatus} value={a.statusActive} dot />
        <Field label={a.fieldRegistered} value={new Date(detail.created_at).toLocaleDateString(locale === "it" ? "it-IT" : "en-US")} />

        <div>
          <p className="text-xs font-semibold uppercase tracking-[.1em] text-white/40">{a.fieldRole}</p>
          <AdminSelect
            value={detail.role}
            onChange={(value) => handleRoleSelect(value as "USER" | "ADMIN")}
            disabled={roleSave === "saving"}
            options={[
              { value: "USER", label: "USER" },
              { value: "ADMIN", label: "ADMIN" },
            ]}
            className="mt-1.5"
          />
          {roleSave === "error" && roleError && <p className="mt-1 text-xs text-red-300">{roleError}</p>}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[.1em] text-white/40">{a.fieldTier}</p>
          <AdminSelect
            value={detail.tier}
            onChange={(value) => handleTierSelect(value as "FREE" | "PREMIUM")}
            disabled={tierSave === "saving"}
            options={[
              { value: "FREE", label: "FREE" },
              { value: "PREMIUM", label: "PREMIUM" },
            ]}
            className="mt-1.5"
          />
        </div>
      </div>

      {pendingRole && (
        <div className="glass mt-4 rounded-2xl border border-lime/25 p-5">
          <p className="text-sm font-semibold text-white">{a.confirmAdminTitle}</p>
          <p className="mt-1 text-xs leading-5 text-white/50">{a.confirmAdminBody}</p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              className="button-primary !min-h-10 !px-4 text-xs"
              onClick={() => {
                applyRoleChange(pendingRole);
                setPendingRole(null);
              }}
            >
              {a.confirmYes}
            </button>
            <button type="button" className="button-secondary !min-h-10 !px-4 text-xs" onClick={() => setPendingRole(null)}>
              {a.confirmCancel}
            </button>
          </div>
        </div>
      )}

      <div className="glass mt-6 rounded-2xl p-6 sm:p-8">
        <p className="text-sm font-semibold text-white">{a.entitlementsTitle}</p>
        <p className="mt-1 text-xs text-white/40">{a.entitlementsNote}</p>
        <div className="mt-4 flex flex-col divide-y divide-white/5">
          {FEATURE_IDS.map((feature) => {
            const current: OverrideState = overrides[feature] === undefined ? "DEFAULT" : overrides[feature] ? "ENABLED" : "DISABLED";
            return (
              <div key={feature} className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm text-white/80">{FEATURE_LABELS[feature]}</span>
                <AdminSelect
                  value={current}
                  onChange={(value) => handleFeatureState(feature, value as OverrideState)}
                  disabled={featureSave[feature] === "saving"}
                  size="sm"
                  className="w-36"
                  options={[
                    { value: "DEFAULT", label: a.entitlementDefault },
                    { value: "ENABLED", label: a.entitlementEnabled },
                    { value: "DISABLED", label: a.entitlementDisabled },
                  ]}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono, dot }: { label: string; value: string; mono?: boolean; dot?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[.1em] text-white/40">{label}</p>
      <p className={`mt-1 text-sm text-white ${mono ? "break-all font-mono text-xs" : ""}`}>
        {dot && <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-lime align-middle" />}
        {value}
      </p>
    </div>
  );
}
