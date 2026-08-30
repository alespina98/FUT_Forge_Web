import {NextResponse} from "next/server";
import {browserCors} from "@/lib/auth/browser-cors";
import {refreshBrowserSession} from "@/lib/auth/device-auth-service";
// Unlike browser/start and browser/token (which anchor a brand-new
// authorization to a specific EA-page context and so keep the strict
// Origin===https://www.ea.com gate), refresh is protected by possession of
// the refresh_token itself - a 32-byte secret, never an ambient/implicit
// credential like a cookie. That is exactly the same model
// desktop/refresh and device/refresh already use with NO Origin check at
// all (see device-auth-service.ts: refreshDesktopSession/
// refreshDeviceSession call the identical refreshSession() this route
// does via refreshBrowserSession). Requiring Origin here forced the
// Chrome extension's privileged background service worker (whose Origin
// is chrome-extension://<id>, never https://www.ea.com) to relay the
// refresh_token through a content script just to make this one call -
// which is exactly the token-must-never-leave-the-service-worker
// violation the Milestone 2 commit audit flagged. Dropping the Origin
// requirement here brings this route to parity with the already-trusted
// desktop/device pattern; browser/start and browser/token are
// deliberately left unchanged.
export function OPTIONS(request:Request){const headers=browserCors(request);return new NextResponse(null,{status:204,headers:headers||undefined})}
export async function POST(request:Request){
  const headers=browserCors(request)||undefined; // present only when called from the EA page; omitted (not rejected) otherwise
  const body=await request.json().catch(()=>null) as{refresh_token?:unknown}|null;
  if(typeof body?.refresh_token!=="string")return NextResponse.json({error:"invalid_request"},{status:400,headers});
  const result=await refreshBrowserSession(body.refresh_token);
  return result.kind==="tokens"&&result.tokens?NextResponse.json(result.tokens,{headers:{...headers,"cache-control":"no-store"}}):NextResponse.json({error:result.kind},{status:401,headers});
}
