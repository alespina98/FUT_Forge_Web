import { NextResponse } from "next/server";
import { getPublishedLeak } from "@/lib/leaks/repository";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  try { const leak = await getPublishedLeak(slug); return leak ? NextResponse.json({ leak }) : NextResponse.json({ error: "Not found" }, { status: 404 }); }
  catch { return NextResponse.json({ error: "Unable to load leak" }, { status: 500 }); }
}
