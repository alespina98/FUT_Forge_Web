# FUT Forge Trader — Contract v0.1.0

Status: **Milestone 1 (foundations)**. This document specifies configuration, persistence and reporting shapes only. It does not authorize, and no code in this repository implements, any real bid, purchase, listing, relist or SBC submission.

Source of research: `FUT_Simple_Trader_Recovery/AUDIT_RECUPERO_FUT_SIMPLE_TRADER.md` (outside this repository, reference-only — see "Provenance" below). The Zod schemas in `contract.ts` are the machine-checked source of truth; this file is the human-readable companion and must stay in sync with it.

## Versioning

- `0.1.0` — Milestone 1. Config/persistence/reporting contract only.
- Breaking changes to any schema in `contract.ts` bump the minor version and must be called out in a PR description; this file's version header must match.

## Provenance

FUT Simple Trader 4.0.2's recovered Chrome extension bundle was analyzed statically (audit, 2026-08-30) to identify the *functional* shape of the original product — field names below are FUT Forge's own, chosen independently, not copied from the recovered bundle. The recovered bundle itself is never imported, fetched, bundled or otherwise made a runtime dependency of FUT Forge; it stays in `FUT_Simple_Trader_Recovery/`, outside every FUT Forge repository.

## Scope of this version

| Area | In v0.1.0 | Notes |
|---|---|---|
| Consent | Yes | `trader_consent` table, `CONSENT_VERSION` |
| User settings (speed mode, stop conditions, post-purchase action) | Yes | `traderUserSettingsSchema` |
| Break/pause settings | Yes | `traderBreakSettingsSchema` |
| Market criteria (filters) | Yes (as data) | `marketCriteriaSchema` — no search execution |
| Price-range walking | Yes (as data) | `priceRangeWalkingSchema` — no walking loop |
| Filters & filter groups (CRUD) | Yes | `filterInputSchema` / `filterGroupInputSchema` |
| Auto Bid preset shape | Yes (as data) | `autoBidPresetConfigSchema` — no bidding engine |
| Auto Trade preset shape | Yes (as data) | `autoTradePresetConfigSchema` — no rotation engine |
| Sessions | Metadata only | `sessionInputSchema`, status restricted to `DRAFT`/`ARCHIVED` |
| Metrics | Read-only, real zeros | `traderMetricsSchema` |
| Event/error codes | Named, not raised | `traderEventCodeSchema` |
| Entitlement | Yes | `trader.access` + 4 sub-flags, see `access.ts` |

## Reserved, not implemented

These names are fixed now so later milestones don't rename things that already shipped as part of the contract, but nothing in Milestone 1 can produce or accept them:

- **Session status** `RUNNING`, `PAUSED`, `STOPPED` — only `DRAFT`/`ARCHIVED` exist today (`sessionStatusSchema`, and the matching `CHECK` constraint in `turso/migrations/0005_trader_foundations.sql`). Adding a running state is a schema *and* migration change, not a value swap.
- **Auto Bid execution** — `autoBidPresetConfigSchema` describes configuration only. No route starts a loop against it.
- **Auto Trade rotation** — `autoTradePresetConfigSchema` fixes the config shape (a set of filter IDs + profit thresholds); the rotation *algorithm* (which filter fires next) is explicitly out of scope for Milestone 1 and will be designed independently, not reverse-engineered from the recovered backend (which the audit found to be an opaque server-side dependency — see the audit's §3 and §6).
- **Fair-price calculation** — no schema or route in this contract computes a "fair" price. FUT Forge's own `price_engine.py` is the candidate engine for a later milestone (see the audit's §7 mapping).
- **SBC solving/submission** — `trader.sbc` exists as an entitlement flag only; no solver contract exists yet.

## Kill switch

`resolveTraderAccess()` (`access.ts`) checks `TRADER_KILL_SWITCH` before anything else: when set, every `trader.*` flag resolves `false` for every user, unconditionally, regardless of per-user `entitlement_overrides` rows. This is the server-side counterpart to the client-side `killSwitch` input `futforge_core/trader.js`'s `bootstrap()` accepts (FUT_Forge repository) and to `TRADER_KILL_SWITCH` in `browser_extension/background.js`. All three are independent, redundant switches — flipping any one of them closes that surface.

## Error/event codes

`traderEventCodeSchema` is a **new** FUT Forge namespace (`TOO_MANY_UNASSIGNED`, `TOO_MANY_RESULTS`, `PRICE_OUT_OF_RANGE`, `DAILY_LIMIT_REACHED`, `INVALID_LIST_PRICE`, `INSUFFICIENT_FUNDS`, `RATE_LIMITED`, `SESSION_EXPIRED`, `KILL_SWITCH_ENGAGED`) — deliberately not the recovered bundle's numeric `alert_5003`–`alert_5009` codes, which stay reference-only.
