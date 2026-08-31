export const EA_WEB_APP_ORIGIN="https://www.ea.com";
export function browserCors(request:Request){const origin=request.headers.get("origin");return origin===EA_WEB_APP_ORIGIN?{"access-control-allow-origin":origin,"access-control-allow-methods":"POST, GET, OPTIONS","access-control-allow-headers":"content-type, authorization","access-control-max-age":"600","vary":"Origin"}:null}
export function browserServiceWorkerOrigin(origin:string|null){return origin===null||/^chrome-extension:\/\/[a-p]{32}$/.test(origin)}
