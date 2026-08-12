import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { PublicFeedProvider } from "@/lib/leaks/ingestion/rss";
import { runIngestion } from "@/lib/leaks/ingestion/pipeline";
import { SupabaseLeakSink } from "@/lib/leaks/ingestion/supabase-sink";

export const maxDuration = 60;
const authorized = (request: Request, secret: string) => { const value = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || ""; const a = Buffer.from(value); const b = Buffer.from(secret); return a.length === b.length && timingSafeEqual(a, b); };
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET; const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!cronSecret || !authorized(request, cronSecret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!serviceKey) return NextResponse.json({ error: "Ingestion is not configured" }, { status: 503 });
  const providers = [new PublicFeedProvider("fut_sheriff", "FUT Sheriff", process.env.LEAKS_FUT_SHERIFF_FEED_URL), new PublicFeedProvider("asy", "ASY", process.env.LEAKS_ASY_FEED_URL)];
  const results = await runIngestion(providers, new SupabaseLeakSink(serviceKey));
  return NextResponse.json({ ok: results.every(result => !result.error), results }, { status: results.some(result => result.error) ? 207 : 200 });
}
