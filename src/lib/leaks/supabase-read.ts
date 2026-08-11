import "server-only";

const DEFAULT_SUPABASE_URL = "https://axjuxmjoowrzmvyhbdhv.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bMremihmEy34CWp5rG6M-g_UuysymCX";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

export async function readPublishedLeaks(params: URLSearchParams): Promise<unknown[]> {
  const endpoint = new URL("/rest/v1/leaks", supabaseUrl);
  endpoint.search = params.toString();

  const response = await fetch(endpoint, {
    headers: {
      apikey: publishableKey,
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Unable to load leaks (${response.status})`);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error("Unable to load leaks (invalid response)");
  return data;
}
