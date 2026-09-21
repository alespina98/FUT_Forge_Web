import { NextResponse, type NextRequest } from "next/server";
import { isLeakCategory, isLeakConfidence } from "@/lib/leaks/core";
import { listPublishedLeaks } from "@/lib/leaks/repository";

// Public/anonymous, non-personalized content - but not (yet) explicitly
// whitelisted as shared-cacheable, so default to no-store rather than
// leaving it exposed to Workers Cache's heuristic freshness.
const NO_STORE = { "cache-control": "private, no-store, max-age=0" } as const;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const category = params.get("category"); const confidence = params.get("confidence"); const order = params.get("order"); const search = params.get("search")?.trim();
  if (category && !isLeakCategory(category)) return NextResponse.json({ error: "Invalid category" }, { status: 400, headers: NO_STORE });
  if (confidence && !isLeakConfidence(confidence)) return NextResponse.json({ error: "Invalid confidence" }, { status: 400, headers: NO_STORE });
  if (order && order !== "newest" && order !== "oldest") return NextResponse.json({ error: "Invalid order" }, { status: 400, headers: NO_STORE });
  if (search && search.length > 100) return NextResponse.json({ error: "Search is too long" }, { status: 400, headers: NO_STORE });
  try { return NextResponse.json({ leaks: await listPublishedLeaks({ category: isLeakCategory(category) ? category : undefined, confidence: isLeakConfidence(confidence) ? confidence : undefined, order: order === "oldest" ? "oldest" : "newest", search }) }, { headers: NO_STORE }); }
  catch { return NextResponse.json({ error: "Unable to load leaks" }, { status: 500, headers: NO_STORE }); }
}
