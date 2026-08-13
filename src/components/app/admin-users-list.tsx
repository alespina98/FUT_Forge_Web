"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "../i18n-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/lib/use-auth-user";
import { AdminSelect } from "./admin-select";

type AdminUserRow = {
  id: string;
  email: string;
  username: string | null;
  role: "USER" | "ADMIN";
  tier: "FREE" | "PREMIUM";
  created_at: string;
  total_count: number;
};

type ListStatus = "loading" | "denied" | "loaded" | "error";

const PAGE_SIZE = 25;

export function AdminUsersList() {
  const { t, locale } = useI18n();
  const a = t.admin;
  const { status: authStatus, user } = useAuthUser();

  const [status, setStatus] = useState<ListStatus>("loading");
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "USER" | "ADMIN">("");
  const [tierFilter, setTierFilter] = useState<"" | "FREE" | "PREMIUM">("");
  const [offset, setOffset] = useState(0);

  const load = useCallback(
    async (nextOffset: number, replace: boolean) => {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc("admin_list_users", {
        p_search: search.trim() || null,
        p_role: roleFilter || null,
        p_tier: tierFilter || null,
        p_limit: PAGE_SIZE,
        p_offset: nextOffset,
      });
      if (error) {
        setStatus("denied");
        return;
      }
      const list = (data || []) as AdminUserRow[];
      setRows((prev) => (replace ? list : [...prev, ...list]));
      setTotalCount(list[0]?.total_count ?? 0);
      setOffset(nextOffset + list.length);
      setStatus("loaded");
    },
    [search, roleFilter, tierFilter],
  );

  useEffect(() => {
    if (authStatus === "loading") return;
    if (authStatus === "signedOut") {
      setStatus("denied");
      return;
    }
    setStatus("loading");
    load(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus, search, roleFilter, tierFilter]);

  if (status === "loading") return null;

  if (status === "denied" || status === "error") {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="section-label">{a.title}</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-.04em]">{a.accessDeniedTitle}</h1>
        <p className="mt-4 text-sm leading-6 text-white/50">{a.accessDeniedBody}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="section-label">{a.title}</p>
      <h1 className="mt-5 text-3xl font-semibold tracking-[-.04em]">{a.usersTitle}</h1>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder={a.searchPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm text-white placeholder:text-white/30 focus:border-lime/40 focus:outline-none"
        />
        <AdminSelect
          value={roleFilter}
          onChange={(value) => setRoleFilter(value as typeof roleFilter)}
          options={[
            { value: "", label: a.roleFilterAll },
            { value: "USER", label: "USER" },
            { value: "ADMIN", label: "ADMIN" },
          ]}
          className="min-w-[150px]"
        />
        <AdminSelect
          value={tierFilter}
          onChange={(value) => setTierFilter(value as typeof tierFilter)}
          options={[
            { value: "", label: a.tierFilterAll },
            { value: "FREE", label: "FREE" },
            { value: "PREMIUM", label: "PREMIUM" },
          ]}
          className="min-w-[150px]"
        />
      </div>

      <div className="glass mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-[.08em] text-white/40">
              <th className="px-4 py-3 font-semibold">{a.columnUsername}</th>
              <th className="px-4 py-3 font-semibold">{a.columnEmail}</th>
              <th className="px-4 py-3 font-semibold">{a.columnRole}</th>
              <th className="px-4 py-3 font-semibold">{a.columnTier}</th>
              <th className="px-4 py-3 font-semibold">{a.columnStatus}</th>
              <th className="px-4 py-3 font-semibold">{a.columnRegistered}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                  {a.empty}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-white/5 last:border-0 hover:bg-white/[.03]">
                <td className="px-4 py-3">
                  <Link href={`/app/admin/users/${row.id}`} className="font-semibold text-white hover:text-lime">
                    {row.username || "—"}
                    {row.id === user?.id && <span className="ml-2 text-xs text-white/30">•</span>}
                  </Link>
                </td>
                <td className="px-4 py-3 text-white/70">{row.email}</td>
                <td className="px-4 py-3">
                  <span className={row.role === "ADMIN" ? "font-semibold text-lime" : "text-white/60"}>{row.role}</span>
                </td>
                <td className="px-4 py-3 text-white/60">{row.tier}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 text-white/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime" />
                    {a.statusActive}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/40">{new Date(row.created_at).toLocaleDateString(locale === "it" ? "it-IT" : "en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && rows.length < totalCount && (
        <button type="button" onClick={() => load(offset, false)} className="button-secondary mt-5">
          {a.loadMore}
        </button>
      )}
    </div>
  );
}
