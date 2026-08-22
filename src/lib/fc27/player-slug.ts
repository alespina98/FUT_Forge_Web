// Kept separate from players.ts (which has "server-only" at the top) so it
// can be imported by client components like player-card.tsx without pulling
// the server-only data-fetch module into the client bundle.
//
// The stored slug already ends with "-{ea_player_id}" (e.g. the raw slug for
// Mbappe is "kylian-mbappe-231747", confirmed via a direct query against
// fc27_players) - stripped here so the public URL reads "{id}-{name}" (e.g.
// "231747-kylian-mbappe") instead of duplicating the id twice.
export function playerUrlSlug(eaPlayerId: number, rawSlug: string): string {
  const cleaned = rawSlug.replace(new RegExp(`-${eaPlayerId}$`), "");
  return `${eaPlayerId}-${cleaned}`;
}
