import { BrowserPricingError, consumeRateLimit, loadPriceData, selectPrices, validateResourceIds } from "@/lib/browser-pricing";
export const dynamic = "force-dynamic";
const EA_ORIGIN = "https://www.ea.com";
const cors = { "Access-Control-Allow-Origin": EA_ORIGIN, Vary: "Origin", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
function allowed(request: Request) { return request.headers.get("origin") === EA_ORIGIN; }
function clientKey(request: Request) { return (request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown").split(",")[0].trim(); }
export async function OPTIONS(request: Request) { return new Response(null, { status: allowed(request) ? 204 : 403, headers: allowed(request) ? cors : undefined }); }
export async function POST(request: Request) {
  if (!allowed(request)) return Response.json({ ok: false, error: { code: "origin_not_allowed", message: "Origin is not allowed." } }, { status: 403 });
  try {
    consumeRateLimit(clientKey(request));
    if (Number(request.headers.get("content-length") || 0) > 64 * 1024) throw new BrowserPricingError(413, "payload_too_large", "Request body is too large.");
    const ids = validateResourceIds((await request.json())?.resourceIds);
    return new Response(selectPrices(ids, await loadPriceData()), { status: 200, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
  } catch (error) {
    const known = error instanceof BrowserPricingError;
    return Response.json({ ok: false, error: { code: known ? error.code : "pricing_unavailable", message: known ? error.message : "Pricing is temporarily unavailable." } }, { status: known ? error.status : 502, headers: cors });
  }
}
