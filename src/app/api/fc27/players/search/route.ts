import { NextResponse, type NextRequest } from "next/server";
import { searchPlayerSuggestions } from "@/lib/fc27/player-search";

// Separate from /api/players/search (a different feature - the Web App's
// card/price search over a different table). This is FC27 database
// autocomplete only: public/anon reads, max 10 name-matched suggestions.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return NextResponse.json({ results: [] });

  const results = await searchPlayerSuggestions(q);
  return NextResponse.json({ results });
}
