// GET/POST /api/trader/consent — Trader terms acceptance (audit §4 "Login e
// abilitazioni"). Identity-only guard: consent is a prerequisite step, not
// itself a gated Trader feature.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTraderIdentity, badRequest } from "@/lib/trader/route-guard";
import { getTraderRepository } from "@/lib/trader/repository";
import { CONSENT_VERSION, consentDecisionSchema } from "@/lib/trader/contract";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ decision: consentDecisionSchema, version: z.literal(CONSENT_VERSION).optional() });

export async function GET(request: Request) {
  const guard = await requireTraderIdentity(request);
  if (!guard.ok) return guard.response;
  const consent = await getTraderRepository().getConsent(guard.applicationUserId);
  return NextResponse.json({ ok: true, consent, currentVersion: CONSENT_VERSION }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const guard = await requireTraderIdentity(request);
  if (!guard.ok) return guard.response;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.issues.map((issue) => issue.message).join("; "));
  await getTraderRepository().setConsent(guard.applicationUserId, CONSENT_VERSION, parsed.data.decision);
  return NextResponse.json({ ok: true });
}
