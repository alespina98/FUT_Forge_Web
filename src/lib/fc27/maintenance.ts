import "server-only";

// Reversible, env-gated kill switch for the FC27 features that still read
// every shard via getAllPlayersStatic() (~160 static-asset subrequests per
// cold Worker isolate: hidden-gems, meta-rankings, rankings, stat-finder,
// and the similar-players lookup in src/lib/fc27/players.ts - see that
// file's fetchSimilarPlayers). Set FC27_HEAVY_FANOUT_DISABLED=1 (or
// "true") as a plain Cloudflare Worker "Variable" (Workers & Pages ->
// fut-forge-web -> Settings -> Variables and Secrets) to take these five
// routes offline instantly - plain-text variables apply to new requests
// immediately, no rebuild/redeploy needed to flip it on or back off - if
// this fan-out is ever confirmed to be driving the site over a provider's
// request quota again. Off by default: nothing changes unless this is
// explicitly set.
export function fc27HeavyFanoutDisabled(): boolean {
  const value = process.env.FC27_HEAVY_FANOUT_DISABLED;
  return value === "1" || value?.toLowerCase() === "true";
}
