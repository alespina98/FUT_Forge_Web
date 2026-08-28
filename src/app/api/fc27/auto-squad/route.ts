import { NextResponse, type NextRequest } from "next/server";
import { buildAutoSquad, type AutoSquadFilters, type AutoSquadPlayer, type AutoSquadPriority } from "@/lib/fc27/auto-squad";
import { calculateMetaRating } from "@/lib/fc27/meta-rating";
import { FORMATIONS, formationById } from "@/lib/fc27/formations";
import { getSearchIndexStatic } from "@/lib/fc27/static-data";

const priorities = new Set<AutoSquadPriority>(["meta", "balanced", "chemistry"]);
const positions = new Set(["GK", "CB", "LB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "CF", "ST"]);
const clean = (value: unknown, max = 80) => typeof value === "string" && value.trim().length <= max ? value.trim() || undefined : undefined;
const integer = (value: unknown, min: number, max: number) => typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : undefined;
// Same single-file source as Squad Builder search (getSearchIndexStatic) -
// previously getAllPlayersStatic()'s ~160-shard fan-out, whose tolerated
// per-shard failures silently shrank the Auto Build candidate pool the same
// way it broke search (see static-data.ts's getSearchIndexStatic comment).
async function pool() {
  return (await getSearchIndexStatic()).map((player) => ({
    ea_player_id:player.ea_player_id,slug:player.slug,display_name:player.display_name,common_name:player.common_name,overall:player.overall,rank:player.rank,
    position_short_label:player.position_short_label,alternate_positions:player.alternate_positions,nationality_id:player.nationality_id,nationality_name:player.nationality_name,
    nationality_image_url:player.nationality_image_url,club_id:player.club_id,club_name:player.club_name,club_image_url:player.club_image_url,league_name:player.league_name,
    pace:player.pace,shooting:player.shooting,passing:player.passing,dribbling:player.dribbling,defending:player.defending,physicality:player.physicality,
    skill_moves_raw:player.skill_moves_raw,weak_foot:player.weak_foot,preferred_foot_code:player.preferred_foot_code,avatar_url:player.avatar_url,
    base_meta:calculateMetaRating(player)?.meta??null,
  })) satisfies AutoSquadPlayer[];
}

export async function GET() {
  const players = await pool();
  const unique = (values: Array<string | null>) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
  return NextResponse.json({
    leagues: unique(players.map((player) => player.league_name)),
    nations: unique(players.map((player) => player.nationality_name)),
    clubs: unique(players.map((player) => player.club_name)),
    positions: [...positions],
  }, { headers: { "cache-control": "public, max-age=3600" } });
}

export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > 8192) return NextResponse.json({ error: "invalid_request" }, { status: 413 });
  let body: Record<string, unknown>; try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const formationId = clean(body.formation, 24), priority = clean(body.priority, 16) as AutoSquadPriority | undefined;
  if (!formationId || !FORMATIONS.some((formation) => formation.id === formationId) || !priority || !priorities.has(priority)) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  for (const key of ["league", "nation", "club"] as const) if (body[key] !== undefined && (typeof body[key] !== "string" || body[key].trim().length > 80)) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const position = clean(body.position, 8); if (position && !positions.has(position)) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const filters: AutoSquadFilters = {
    league: clean(body.league), nation: clean(body.nation), club: clean(body.club), position,
    overallMin: integer(body.overallMin, 1, 99), overallMax: integer(body.overallMax, 1, 99), metaMin: integer(body.metaMin, 1, 100),
    chemistryMin: integer(body.chemistryMin, 0, 33), priority,
  };
  for (const key of ["overallMin", "overallMax", "metaMin", "chemistryMin"] as const) if (body[key] !== undefined && filters[key] === undefined) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  if (filters.overallMin !== undefined && filters.overallMax !== undefined && filters.overallMin > filters.overallMax) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const result = buildAutoSquad(formationById(formationId), await pool(), filters);
  if (!result) return NextResponse.json({ error: "no_result" }, { status: 422 });
  return NextResponse.json(result);
}
