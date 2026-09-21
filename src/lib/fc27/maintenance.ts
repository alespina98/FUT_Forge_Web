import "server-only";

// Reversible, env-gated kill switch for the FC27 features that still read
// every shard via getAllPlayersStatic() (~160 static-asset subrequests per
// cold Worker isolate: hidden-gems, meta-rankings, rankings, stat-finder,
// and the similar-players lookup in src/lib/fc27/players.ts - see that
// file's fetchSimilarPlayers). Set FC27_HEAVY_FANOUT_DISABLED=1 (Cloudflare
// env var/secret) to take these five routes offline instantly - no code
// deploy needed to flip it back - if this fan-out is ever confirmed to be
// driving the site over a provider's request quota again. Off by default:
// nothing changes unless this is explicitly set.
export function fc27HeavyFanoutDisabled(): boolean {
  return process.env.FC27_HEAVY_FANOUT_DISABLED === "1";
}
