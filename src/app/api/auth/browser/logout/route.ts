import {NextResponse} from "next/server";
import {browserCors} from "@/lib/auth/browser-cors";
import {revokeBrowserSession} from "@/lib/auth/device-auth-service";
// Same reasoning as browser/refresh (see that route's comment): logout is
// protected by possession of the refresh_token secret, not by Origin, and
// desktop/logout already has zero Origin restriction for the identical
// underlying revoke call. This lets the extension's background service
// worker revoke its own session directly, without ever handing the token
// to a content script. browser/start and browser/token keep the strict
// EA-origin gate unchanged.
export function OPTIONS(request:Request){const headers=browserCors(request);return new NextResponse(null,{status:204,headers:headers||undefined})}
export async function POST(request:Request){
  const headers=browserCors(request)||undefined; // present only when called from the EA page; omitted (not rejected) otherwise
  const body=await request.json().catch(()=>null) as{refresh_token?:unknown}|null;
  if(typeof body?.refresh_token==="string")await revokeBrowserSession(body.refresh_token);
  return NextResponse.json({ok:true},{headers:{...headers,"cache-control":"no-store"}});
}
