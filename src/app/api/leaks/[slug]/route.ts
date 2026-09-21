import { NextResponse } from "next/server";
import { getPublishedLeak } from "@/lib/leaks/repository";

const NO_STORE = { "cache-control": "private, no-store, max-age=0" } as const;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return NextResponse.json({ error: "Invalid slug" }, { status: 400, headers: NO_STORE });
  try { const leak = await getPublishedLeak(slug); return leak ? NextResponse.json({ leak }, { headers: NO_STORE }) : NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE }); }
  catch { return NextResponse.json({ error: "Unable to load leak" }, { status: 500, headers: NO_STORE }); }
}
