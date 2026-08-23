import type { RankingPlayer } from "./rankings-shared";

export const STAT_FINDER_PAGE_SIZE = 50;
export const STAT_FINDER_SORTS = ["overall", "pace", "shooting", "passing", "dribbling", "defending", "physical", "name"] as const;
export type StatFinderSort = (typeof STAT_FINDER_SORTS)[number];

export const FACE_FILTERS = [
  ["pacMin","pace"],["shoMin","shooting"],["pasMin","passing"],["driMin","dribbling"],["defMin","defending"],["phyMin","physicality"],
] as const;

export const DETAIL_GROUPS = {
  pace: [["accelerationMin","acceleration"],["sprintSpeedMin","sprint_speed"]],
  shooting: [["positioningMin","positioning"],["finishingMin","finishing"],["shotPowerMin","shot_power"],["longShotsMin","long_shots"],["volleysMin","volleys"],["penaltiesMin","penalties"]],
  passing: [["visionMin","vision"],["crossingMin","crossing"],["freeKickMin","free_kick_accuracy"],["shortPassingMin","short_passing"],["longPassingMin","long_passing"],["curveMin","curve"]],
  dribbling: [["agilityMin","agility"],["balanceMin","balance"],["reactionsMin","reactions"],["ballControlMin","ball_control"],["dribblingStatMin","dribbling"],["composureMin","composure"]],
  defending: [["interceptionsMin","interceptions"],["headingMin","heading_accuracy"],["defAwarenessMin","defensive_awareness"],["standingTackleMin","standing_tackle"],["slidingTackleMin","sliding_tackle"]],
  physical: [["jumpingMin","jumping"],["staminaMin","stamina"],["strengthMin","strength"],["aggressionMin","aggression"]],
} as const;

// EA's six goalkeeper card values use the same six scalar storage slots as
// outfield face stats, relabelled DIV/HAN/KIC/REF/SPD/POS (the established
// Fc27BasePlayerCard mapping). The detailed goalkeeping JSON has no SPD key.
export const GK_FILTERS = [["divMin","pace"],["hanMin","shooting"],["kicMin","passing"],["refMin","dribbling"],["spdMin","defending"],["gkPosMin","physicality"]] as const;
export type NumericParam = typeof FACE_FILTERS[number][0] | typeof GK_FILTERS[number][0] | { [K in keyof typeof DETAIL_GROUPS]: typeof DETAIL_GROUPS[K][number][0] }[keyof typeof DETAIL_GROUPS] | "ovrMin" | "ovrMax" | "skillMovesMin" | "weakFootMin";

export type StatFinderQuery = {
  q?:string;position?:string;nation?:string;club?:string;league?:string;preferredFoot?:"Right"|"Left";sort:StatFinderSort;page:number;
  numeric:Partial<Record<NumericParam,number>>;
};
export type StatFinderResult = { players:RankingPlayer[];total:number;page:number;pageCount:number;elapsedMs:number };

export function isStatFinderSort(value:string|undefined):value is StatFinderSort{return !!value&&STAT_FINDER_SORTS.includes(value as StatFinderSort);}
