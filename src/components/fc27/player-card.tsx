import Link from "next/link";
import { Fc27BasePlayerCard } from "./fc27-base-player-card";
import { playerUrlSlug } from "@/lib/fc27/player-slug";
import type { PlayerListItem } from "@/lib/fc27/players";

// Whole card is a real <Link> (not a div with a click handler) - works
// with ctrl/cmd-click, keyboard focus/Enter, and middle-click open in new
// tab for free. Fc27BasePlayerCard already renders the full Bronze/Silver/
// Gold item presentation - rating, position, portrait, name, nation, club
// and all 6 headline stats - so nothing is duplicated below it.
export function PlayerCard({ player }: { player: PlayerListItem }) {
  return (
    <Link href={`/fc27/players/${playerUrlSlug(player.ea_player_id, player.slug)}`} className="fc27-base-card-link">
      <Fc27BasePlayerCard
        eaPlayerId={player.ea_player_id}
        overall={player.overall}
        position={player.position_short_label}
        playerName={player.display_name}
        commonName={player.common_name}
        avatarUrl={player.avatar_url}
        nationalityImageUrl={player.nationality_image_url}
        nationalityName={player.nationality_name}
        clubImageUrl={player.club_image_url}
        clubName={player.club_name}
        pace={player.pace}
        shooting={player.shooting}
        passing={player.passing}
        dribbling={player.dribbling}
        defending={player.defending}
        physicality={player.physicality}
        isGoalkeeper={player.position_short_label === "GK"}
        alternatePosition={player.alternate_positions[0]?.short_label ?? null}
        preferredFootCode={player.preferred_foot_code}
        skillMoves={player.skill_moves_raw}
        weakFoot={player.weak_foot}
        size="grid"
      />
    </Link>
  );
}
