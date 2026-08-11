import { NextResponse, type NextRequest } from "next/server";
import { isLeakCategory, isLeakConfidence } from "@/lib/leaks/core";
import { listPublishedLeaks } from "@/lib/leaks/repository";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const category = params.get("category"); const confidence = params.get("confidence"); const order = params.get("order"); const search = params.get("search")?.trim();
  if (category && !isLeakCategory(category)) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  if (confidence && !isLeakConfidence(confidence)) return NextResponse.json({ error: "Invalid confidence" }, { status: 400 });
  if (order && order !== "newest" && order !== "oldest") return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  if (search && search.length > 100) return NextResponse.json({ error: "Search is too long" }, { status: 400 });
  try { return NextResponse.json({ leaks: await listPublishedLeaks({ category: isLeakCategory(category) ? category : undefined, confidence: isLeakConfidence(confidence) ? confidence : undefined, order: order === "oldest" ? "oldest" : "newest", search }) }); }
  catch { return NextResponse.json({ error: "Unable to load leaks" }, { status: 500 }); }
}
