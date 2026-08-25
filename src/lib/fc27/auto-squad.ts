import type { Formation } from "./formations";
import type { PlayerListItem } from "./players";
// @ts-expect-error Node's strip-types test runner needs the explicit extension.
import { calculateSquadChemistry, isPositionCompatible } from "./squad-chemistry.ts";

export type AutoSquadPriority = "meta" | "balanced" | "chemistry";
export type AutoSquadPlayer = PlayerListItem & {
  base_meta: number | null;
};
export type AutoSquadFilters = {
  league?: string;
  nation?: string;
  club?: string;
  position?: string;
  overallMin?: number;
  overallMax?: number;
  metaMin?: number;
  priority: AutoSquadPriority;
  chemistryMin?: number;
};
export type AutoSquadResult = {
  slots: Record<string, AutoSquadPlayer>;
  averageOverall: number;
  averageMeta: number;
  chemistry: number;
};

const BEAM_WIDTH = 180;
const META_BEAM_WIDTH = 100;
const CANDIDATES_PER_SLOT = 40;
const text = (value: string | null | undefined) => (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en");
const meta = (player: AutoSquadPlayer) => player.base_meta ?? -1;
const playerOrder = (a: AutoSquadPlayer, b: AutoSquadPlayer) => meta(b) - meta(a) || b.overall - a.overall || a.ea_player_id - b.ea_player_id || a.display_name.localeCompare(b.display_name);

export function filterAutoSquadPlayers(players: readonly AutoSquadPlayer[], filters: AutoSquadFilters) {
  return players.filter((player) =>
    (!filters.league || text(player.league_name) === text(filters.league)) &&
    (!filters.nation || text(player.nationality_name) === text(filters.nation)) &&
    (!filters.club || text(player.club_name) === text(filters.club)) &&
    (!filters.position || player.position_short_label === filters.position || player.alternate_positions.some((position) => position.short_label === filters.position)) &&
    (filters.overallMin === undefined || player.overall >= filters.overallMin) &&
    (filters.overallMax === undefined || player.overall <= filters.overallMax) &&
    (filters.metaMin === undefined || (player.base_meta !== null && player.base_meta >= filters.metaMin))
  );
}

type State = { slots: Record<string, AutoSquadPlayer>; ids: Set<number>; metaTotal: number; overallTotal: number; chemistry: number };
function stateScore(state: State, priority: AutoSquadPriority) {
  if (priority === "chemistry") return state.chemistry * 10000 + state.metaTotal * 10 + state.overallTotal;
  if (priority === "balanced") return state.metaTotal * 100 + state.chemistry * 40 + state.overallTotal;
  return state.metaTotal * 100 + state.overallTotal + state.chemistry / 100;
}
function compareStates(a: State, b: State, priority: AutoSquadPriority) {
  const score = stateScore(b, priority) - stateScore(a, priority);
  if (score) return score;
  const aIds = [...a.ids].sort((x, y) => x - y).join(","), bIds = [...b.ids].sort((x, y) => x - y).join(",");
  return aIds.localeCompare(bIds);
}

export function buildAutoSquad(formation: Formation, players: readonly AutoSquadPlayer[], filters: AutoSquadFilters): AutoSquadResult | null {
  const eligible = filterAutoSquadPlayers(players, filters);
  if (eligible.length < 11) return null;
  const slotCandidates = formation.slots.map((slot) => ({ slot, candidates: eligible.filter((player) => isPositionCompatible(player, slot.position)).sort(playerOrder).slice(0, CANDIDATES_PER_SLOT) }));
  if (slotCandidates.some(({ candidates }) => candidates.length === 0)) return null;
  slotCandidates.sort((a, b) => a.candidates.length - b.candidates.length || a.slot.id.localeCompare(b.slot.id));
  let beam: State[] = [{ slots: {}, ids: new Set(), metaTotal: 0, overallTotal: 0, chemistry: 0 }];
  for (const [slotIndex, { slot, candidates }] of slotCandidates.entries()) {
    const next: State[] = [];
    for (const state of beam) for (const player of candidates) {
      if (state.ids.has(player.ea_player_id)) continue;
      const slots = { ...state.slots, [slot.id]: player }, ids = new Set(state.ids).add(player.ea_player_id);
      const needsChemistry = filters.priority !== "meta" || slotIndex === slotCandidates.length - 1;
      const chemistry = needsChemistry ? calculateSquadChemistry(formation.slots.flatMap((formationSlot) => slots[formationSlot.id] ? [{ player: slots[formationSlot.id], slot: formationSlot.position }] : [])).total : 0;
      next.push({ slots, ids, metaTotal: state.metaTotal + Math.max(0, meta(player)), overallTotal: state.overallTotal + player.overall, chemistry });
    }
    if (!next.length) return null;
    next.sort((a, b) => compareStates(a, b, filters.priority));
    beam = next.slice(0, filters.priority === "meta" ? META_BEAM_WIDTH : BEAM_WIDTH);
  }
  const valid = beam.filter((state) => filters.chemistryMin === undefined || state.chemistry >= filters.chemistryMin).sort((a, b) => compareStates(a, b, filters.priority));
  const best = valid[0]; if (!best) return null;
  return { slots: best.slots, averageOverall: best.overallTotal / 11, averageMeta: best.metaTotal / 11, chemistry: best.chemistry };
}

export type BudgetOptimizerRequest = { formation: Formation; budget: number; players: readonly AutoSquadPlayer[]; filters: AutoSquadFilters };
export interface BudgetSquadOptimizer { optimize(request: BudgetOptimizerRequest, prices: ReadonlyMap<number, number>): Promise<AutoSquadResult | null> }
