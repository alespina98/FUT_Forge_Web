export const RANKING_STATS = ["overall", "pace", "shooting", "passing", "dribbling", "defending", "physical"] as const;
export type RankingStat = (typeof RANKING_STATS)[number];
export function isRankingStat(value: string | undefined): value is RankingStat { return !!value && RANKING_STATS.includes(value as RankingStat); }
export type RankingPlayer = {
  ea_player_id: number; slug: string; display_name: string; overall: number; position_short_label: string;
  nationality_name: string; nationality_image_url: string | null; club_name: string | null; club_image_url: string | null;
  league_name: string | null; avatar_url: string | null; pace: number | null; shooting: number | null; passing: number | null;
  dribbling: number | null; defending: number | null; physicality: number | null;
};
export function rankingValue(player: RankingPlayer, stat: RankingStat): number | null {
  return stat === "physical" ? player.physicality : player[stat];
}
