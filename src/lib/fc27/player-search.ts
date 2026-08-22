import "server-only";

// Autocomplete search - separate from the full grid search in players.ts.
// Public/anon PostgREST reads only, same as the rest of this data layer.
const DEFAULT_SUPABASE_URL = "https://axjuxmjoowrzmvyhbdhv.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_bMremihmEy34CWp5rG6M-g_UuysymCX";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export type PlayerSuggestion = {
  ea_player_id: number;
  slug: string;
  display_name: string;
  overall: number;
  position_short_label: string;
  club_name: string | null;
  nationality_name: string;
};

// Same accent-folding as fetchPlayers's full-text search (players.ts) -
// duplicated rather than imported because players.ts is a much larger
// server-only module and this route only needs the one pure helper.
function foldAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

type CandidateRow = PlayerSuggestion & {
  first_name: string;
  last_name: string;
  common_name: string | null;
};

// Player-name-only prefix autocomplete. fc27_players has no name-only
// accent-folded column (search_text also bakes in nation/club/league/
// position - see migration 0008), and this task explicitly rules out any
// migration/DB change, so this runs in two stages instead of one query:
//
// 1) A cheap, GIN-indexed Postgres full-text prefix query
//    (to_tsquery('simple', 'word:*'), the `fts` PostgREST operator) against
//    search_document pulls a bounded candidate set (<=40 rows) - fast even
//    across 20,689 rows, but still catches non-name matches (e.g. a club
//    name starting with the query).
// 2) Those candidates are re-checked in JS against ONLY the name fields
//    (first_name/last_name/common_name/display_name, each folded the same
//    way search_text was built at import time) so a match on club/nation/
//    league alone is discarded - satisfying the "name fields only" rule
//    without needing a dedicated name-only DB column.
export async function searchPlayerSuggestions(rawQuery: string): Promise<PlayerSuggestion[]> {
  const folded = foldAccents(rawQuery.trim());
  const words = folded
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9]/g, "")) // strip anything that could break tsquery syntax (hyphens, apostrophes, etc.)
    .filter(Boolean);
  if (words.length === 0) return [];

  const tsQuery = words.map((w) => `${w}:*`).join(" & ");
  const params = new URLSearchParams({
    select: "ea_player_id,slug,display_name,first_name,last_name,common_name,overall,position_short_label,club_name,nationality_name",
    search_document: `fts(simple).${tsQuery}`,
    order: "overall.desc,rank.asc",
    limit: "40",
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/fc27_players?${params}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    next: { revalidate: 60 },
  });
  if (!response.ok) throw new Error(`Unable to search players (${response.status})`);
  const rows = (await response.json()) as CandidateRow[];

  const matches = rows.filter((row) => {
    // Split on hyphens/apostrophes too, not just spaces - "Djemba-Mbappé"
    // must tokenize to ["djemba","mbappe"] so "mbap" matches the second
    // half, not just the whole hyphenated surname as one unbreakable word.
    const nameWords = foldAccents([row.first_name, row.last_name, row.common_name, row.display_name].filter(Boolean).join(" ")).split(/[\s\-']+/).filter(Boolean);
    return words.every((w) => nameWords.some((nw) => nw.startsWith(w)));
  });

  return matches.slice(0, 10).map((row) => ({
    ea_player_id: row.ea_player_id,
    slug: row.slug,
    display_name: row.display_name,
    overall: row.overall,
    position_short_label: row.position_short_label,
    club_name: row.club_name,
    nationality_name: row.nationality_name,
  }));
}
