// FUT Forge Trader — persistence (Milestone 1).
//
// Same shape as src/lib/auth/device-auth-store.ts: its own Turso Client and
// singleton getter, every query scoped by application_user_id so one user
// can never read or mutate another user's row (see repository.test.mjs for
// the cross-user isolation tests). JSON columns (criteria/config) are only
// ever written with data already validated against contract.ts - this file
// does not re-validate, callers (the API routes) must.
import "server-only";
import { randomUUID } from "node:crypto";
import { createClient, type Client, type Row } from "@libsql/client";
import type { TraderAutoBidPresetConfig, TraderAutoTradePresetConfig, TraderBreakSettings, TraderConsentDecision, TraderFilterGroupInput, TraderFilterInput, TraderMarketCriteria, TraderPresetKind, TraderPriceRangeWalking, TraderSessionKind, TraderSessionStatus, TraderUserSettings } from "./contract";

const iso = (date = new Date()) => date.toISOString();

export type TraderConsent = { version: string; decision: TraderConsentDecision; decidedAt: string };
export type TraderFilterGroup = { id: string; name: string; createdAt: string; updatedAt: string };
export type TraderFilter = { id: string; groupId: string | null; name: string; criteria: TraderMarketCriteria; createdAt: string; updatedAt: string };
export type TraderPreset = { id: string; kind: TraderPresetKind; name: string; config: TraderAutoBidPresetConfig | TraderAutoTradePresetConfig; createdAt: string; updatedAt: string };
export type TraderSession = { id: string; kind: TraderSessionKind; status: TraderSessionStatus; config: unknown; createdAt: string; updatedAt: string };
export type TraderMetricsRow = { totalSearches: number; totalBids: number; totalSuccessBids: number; updatedAt: string };

function filterGroup(row: Row): TraderFilterGroup {
  return { id: String(row.id), name: String(row.name), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
function filter(row: Row): TraderFilter {
  return { id: String(row.id), groupId: row.group_id == null ? null : String(row.group_id), name: String(row.name), criteria: JSON.parse(String(row.criteria)), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
function preset(row: Row): TraderPreset {
  return { id: String(row.id), kind: String(row.kind) as TraderPresetKind, name: String(row.name), config: JSON.parse(String(row.config)), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
function session(row: Row): TraderSession {
  return { id: String(row.id), kind: String(row.kind) as TraderSessionKind, status: String(row.status) as TraderSessionStatus, config: JSON.parse(String(row.config)), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}

export class TraderRepository {
  private readonly client: Client;
  constructor(client: Client) {
    this.client = client;
  }

  // --- consent -----------------------------------------------------------
  async getConsent(applicationUserId: string): Promise<TraderConsent | null> {
    const r = await this.client.execute({ sql: "SELECT version,decision,decided_at FROM trader_consent WHERE application_user_id=?", args: [applicationUserId] });
    const row = r.rows[0];
    return row ? { version: String(row.version), decision: String(row.decision) as TraderConsentDecision, decidedAt: String(row.decided_at) } : null;
  }
  async setConsent(applicationUserId: string, version: string, decision: TraderConsentDecision): Promise<void> {
    const now = iso();
    await this.client.execute({
      sql: "INSERT INTO trader_consent(application_user_id,version,decision,decided_at) VALUES(?,?,?,?) ON CONFLICT(application_user_id) DO UPDATE SET version=excluded.version,decision=excluded.decision,decided_at=excluded.decided_at",
      args: [applicationUserId, version, decision, now],
    });
  }

  // --- user settings -------------------------------------------------------
  async getUserSettings(applicationUserId: string): Promise<TraderUserSettings | null> {
    const r = await this.client.execute({ sql: "SELECT * FROM trader_user_settings WHERE application_user_id=?", args: [applicationUserId] });
    const row = r.rows[0];
    if (!row) return null;
    return {
      speedMode: String(row.speed_mode) as TraderUserSettings["speedMode"],
      postPurchaseAction: String(row.post_purchase_action) as TraderUserSettings["postPurchaseAction"],
      stopAfterEvent: row.stop_after_event == null ? null : (String(row.stop_after_event) as NonNullable<TraderUserSettings["stopAfterEvent"]>),
      stopAfterValue: row.stop_after_value == null ? null : Number(row.stop_after_value),
      maxCardPrice: row.max_card_price == null ? null : Number(row.max_card_price),
      minProfitAmount: row.min_profit_amount == null ? null : Number(row.min_profit_amount),
      minProfitPercent: row.min_profit_percent == null ? null : Number(row.min_profit_percent),
    };
  }
  async upsertUserSettings(applicationUserId: string, value: TraderUserSettings): Promise<void> {
    const now = iso();
    await this.client.execute({
      sql: `INSERT INTO trader_user_settings(application_user_id,speed_mode,post_purchase_action,stop_after_event,stop_after_value,max_card_price,min_profit_amount,min_profit_percent,updated_at)
            VALUES(?,?,?,?,?,?,?,?,?)
            ON CONFLICT(application_user_id) DO UPDATE SET speed_mode=excluded.speed_mode,post_purchase_action=excluded.post_purchase_action,stop_after_event=excluded.stop_after_event,stop_after_value=excluded.stop_after_value,max_card_price=excluded.max_card_price,min_profit_amount=excluded.min_profit_amount,min_profit_percent=excluded.min_profit_percent,updated_at=excluded.updated_at`,
      args: [applicationUserId, value.speedMode, value.postPurchaseAction, value.stopAfterEvent, value.stopAfterValue, value.maxCardPrice, value.minProfitAmount, value.minProfitPercent, now],
    });
  }

  // --- break settings ------------------------------------------------------
  async getBreakSettings(applicationUserId: string): Promise<TraderBreakSettings | null> {
    const r = await this.client.execute({ sql: "SELECT * FROM trader_break_settings WHERE application_user_id=?", args: [applicationUserId] });
    const row = r.rows[0];
    if (!row) return null;
    return {
      breaksAfterSearches: Number(row.breaks_after_searches),
      breaksSeconds: Number(row.breaks_seconds),
      longerBreaksAfterSearches: row.longer_breaks_after_searches == null ? null : Number(row.longer_breaks_after_searches),
      longerBreaksSeconds: row.longer_breaks_seconds == null ? null : Number(row.longer_breaks_seconds),
      randomizePercent: Number(row.randomize_percent),
    };
  }
  async upsertBreakSettings(applicationUserId: string, value: TraderBreakSettings): Promise<void> {
    const now = iso();
    await this.client.execute({
      sql: `INSERT INTO trader_break_settings(application_user_id,breaks_after_searches,breaks_seconds,longer_breaks_after_searches,longer_breaks_seconds,randomize_percent,updated_at)
            VALUES(?,?,?,?,?,?,?)
            ON CONFLICT(application_user_id) DO UPDATE SET breaks_after_searches=excluded.breaks_after_searches,breaks_seconds=excluded.breaks_seconds,longer_breaks_after_searches=excluded.longer_breaks_after_searches,longer_breaks_seconds=excluded.longer_breaks_seconds,randomize_percent=excluded.randomize_percent,updated_at=excluded.updated_at`,
      args: [applicationUserId, value.breaksAfterSearches, value.breaksSeconds, value.longerBreaksAfterSearches, value.longerBreaksSeconds, value.randomizePercent, now],
    });
  }

  // --- filter groups ---------------------------------------------------------
  async listFilterGroups(applicationUserId: string): Promise<TraderFilterGroup[]> {
    const r = await this.client.execute({ sql: "SELECT * FROM trader_filter_groups WHERE application_user_id=? ORDER BY created_at DESC", args: [applicationUserId] });
    return r.rows.map(filterGroup);
  }
  async createFilterGroup(applicationUserId: string, input: TraderFilterGroupInput): Promise<TraderFilterGroup> {
    const id = randomUUID();
    const now = iso();
    await this.client.execute({ sql: "INSERT INTO trader_filter_groups(id,application_user_id,name,created_at,updated_at) VALUES(?,?,?,?,?)", args: [id, applicationUserId, input.name, now, now] });
    return { id, name: input.name, createdAt: now, updatedAt: now };
  }
  async deleteFilterGroup(applicationUserId: string, id: string): Promise<boolean> {
    const r = await this.client.execute({ sql: "DELETE FROM trader_filter_groups WHERE id=? AND application_user_id=?", args: [id, applicationUserId] });
    return r.rowsAffected === 1;
  }

  // --- filters -----------------------------------------------------------
  async listFilters(applicationUserId: string): Promise<TraderFilter[]> {
    const r = await this.client.execute({ sql: "SELECT * FROM trader_filters WHERE application_user_id=? ORDER BY created_at DESC", args: [applicationUserId] });
    return r.rows.map(filter);
  }
  async createFilter(applicationUserId: string, input: TraderFilterInput): Promise<TraderFilter> {
    if (input.groupId) {
      const owned = await this.client.execute({ sql: "SELECT 1 FROM trader_filter_groups WHERE id=? AND application_user_id=?", args: [input.groupId, applicationUserId] });
      if (owned.rows.length === 0) throw new Error("GROUP_NOT_FOUND");
    }
    const id = randomUUID();
    const now = iso();
    await this.client.execute({ sql: "INSERT INTO trader_filters(id,application_user_id,group_id,name,criteria,created_at,updated_at) VALUES(?,?,?,?,?,?,?)", args: [id, applicationUserId, input.groupId ?? null, input.name, JSON.stringify(input.criteria), now, now] });
    return { id, groupId: input.groupId ?? null, name: input.name, criteria: input.criteria, createdAt: now, updatedAt: now };
  }
  async updateFilter(applicationUserId: string, id: string, input: TraderFilterInput): Promise<boolean> {
    if (input.groupId) {
      const owned = await this.client.execute({ sql: "SELECT 1 FROM trader_filter_groups WHERE id=? AND application_user_id=?", args: [input.groupId, applicationUserId] });
      if (owned.rows.length === 0) throw new Error("GROUP_NOT_FOUND");
    }
    const now = iso();
    const r = await this.client.execute({ sql: "UPDATE trader_filters SET group_id=?,name=?,criteria=?,updated_at=? WHERE id=? AND application_user_id=?", args: [input.groupId ?? null, input.name, JSON.stringify(input.criteria), now, id, applicationUserId] });
    return r.rowsAffected === 1;
  }
  async deleteFilter(applicationUserId: string, id: string): Promise<boolean> {
    const r = await this.client.execute({ sql: "DELETE FROM trader_filters WHERE id=? AND application_user_id=?", args: [id, applicationUserId] });
    return r.rowsAffected === 1;
  }

  // --- presets -------------------------------------------------------------
  async listPresets(applicationUserId: string): Promise<TraderPreset[]> {
    const r = await this.client.execute({ sql: "SELECT * FROM trader_presets WHERE application_user_id=? ORDER BY created_at DESC", args: [applicationUserId] });
    return r.rows.map(preset);
  }
  async createPreset(applicationUserId: string, kind: TraderPresetKind, name: string, config: TraderAutoBidPresetConfig | TraderAutoTradePresetConfig): Promise<TraderPreset> {
    const id = randomUUID();
    const now = iso();
    await this.client.execute({ sql: "INSERT INTO trader_presets(id,application_user_id,kind,name,config,created_at,updated_at) VALUES(?,?,?,?,?,?,?)", args: [id, applicationUserId, kind, name, JSON.stringify(config), now, now] });
    return { id, kind, name, config, createdAt: now, updatedAt: now };
  }
  async deletePreset(applicationUserId: string, id: string): Promise<boolean> {
    const r = await this.client.execute({ sql: "DELETE FROM trader_presets WHERE id=? AND application_user_id=?", args: [id, applicationUserId] });
    return r.rowsAffected === 1;
  }

  // --- sessions (M1: metadata only, status restricted to DRAFT/ARCHIVED by the DB CHECK) ---
  async listSessions(applicationUserId: string): Promise<TraderSession[]> {
    const r = await this.client.execute({ sql: "SELECT * FROM trader_sessions WHERE application_user_id=? ORDER BY created_at DESC", args: [applicationUserId] });
    return r.rows.map(session);
  }
  async createSession(applicationUserId: string, kind: TraderSessionKind, config: unknown): Promise<TraderSession> {
    const id = randomUUID();
    const now = iso();
    await this.client.execute({ sql: "INSERT INTO trader_sessions(id,application_user_id,kind,status,config,created_at,updated_at) VALUES(?,?,?,'DRAFT',?,?,?)", args: [id, applicationUserId, kind, JSON.stringify(config), now, now] });
    return { id, kind, status: "DRAFT", config, createdAt: now, updatedAt: now };
  }
  async archiveSession(applicationUserId: string, id: string): Promise<boolean> {
    const now = iso();
    const r = await this.client.execute({ sql: "UPDATE trader_sessions SET status='ARCHIVED',updated_at=? WHERE id=? AND application_user_id=? AND status='DRAFT'", args: [now, id, applicationUserId] });
    return r.rowsAffected === 1;
  }
  async deleteSession(applicationUserId: string, id: string): Promise<boolean> {
    const r = await this.client.execute({ sql: "DELETE FROM trader_sessions WHERE id=? AND application_user_id=?", args: [id, applicationUserId] });
    return r.rowsAffected === 1;
  }

  // --- metrics (M1: real zeros - nothing increments these yet) -------------
  async getMetrics(applicationUserId: string): Promise<TraderMetricsRow> {
    const r = await this.client.execute({ sql: "SELECT * FROM trader_session_metrics WHERE application_user_id=?", args: [applicationUserId] });
    const row = r.rows[0];
    if (!row) return { totalSearches: 0, totalBids: 0, totalSuccessBids: 0, updatedAt: iso() };
    return { totalSearches: Number(row.total_searches), totalBids: Number(row.total_bids), totalSuccessBids: Number(row.total_success_bids), updatedAt: String(row.updated_at) };
  }
}

let singleton: TraderRepository | undefined;
export function getTraderRepository(): TraderRepository {
  if (singleton) return singleton;
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL is required");
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url.startsWith("file:") && !authToken) throw new Error("TURSO_AUTH_TOKEN is required");
  singleton = new TraderRepository(createClient({ url, authToken }));
  return singleton;
}

// Only for tests: swap in a repository built on an in-memory/migrated test
// client (see repository.test.mjs), mirroring how turso-identity-repository
// tests construct TursoIdentityRepository directly instead of going through
// the process.env-backed singleton.
export function __setTraderRepositoryForTests(repository: TraderRepository | undefined): void {
  singleton = repository;
}

// Type import kept for consumers that only need the walking-step shape
// alongside a filter (e.g. session creation) without pulling in the full
// contract module.
export type { TraderPriceRangeWalking };
