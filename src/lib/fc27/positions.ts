import "server-only";
import { unstable_cache } from "next/cache";
import { FC27_POSITIONS, type Fc27Position } from "./best-positions";

const DEFAULT_URL = "https://axjuxmjoowrzmvyhbdhv.supabase.co";
const DEFAULT_KEY = "sb_publishable_bMremihmEy34CWp5rG6M-g_UuysymCX";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;

export type PositionCount = { position: Fc27Position; count: number };

export const fetchPositionCounts = unstable_cache(async (): Promise<PositionCount[]> => {
  return Promise.all(FC27_POSITIONS.map(async (position) => {
    const params = new URLSearchParams({ select: "ea_player_id", position_short_label: `eq.${position}`, limit: "1" });
    const response = await fetch(`${url}/rest/v1/fc27_players?${params}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
    });
    if (!response.ok) throw new Error(`Unable to count FC27 ${position} players (${response.status})`);
    const count = Number(response.headers.get("content-range")?.split("/")[1]);
    if (!Number.isSafeInteger(count)) throw new Error(`Unable to determine FC27 ${position} count`);
    return { position, count };
  }));
}, ["fc27-position-counts-v1"], { revalidate: 3600 });
