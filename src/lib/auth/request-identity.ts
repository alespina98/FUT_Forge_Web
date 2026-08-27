import "server-only";
// @ts-expect-error TS5097: direct Node test execution requires the extension.
import {verifyFutForgeAccessToken} from "./futforge-token.ts";
// @ts-expect-error TS5097: direct Node test execution requires the extension.
import {getIdentityRepository} from "./turso-identity-repository.ts";

export type RequestIdentity={applicationUserId:string;provider:"FUTFORGE"|"SUPABASE";scope:string[];clientType:string|null};
export async function resolveRequestIdentity(request:Request,requiredScope?:string):Promise<RequestIdentity|null>{
  const header=request.headers.get("authorization")??"";if(!header.startsWith("Bearer "))return null;const token=header.slice(7).trim();if(!token)return null;
  try{const value=await verifyFutForgeAccessToken(token,requiredScope);if(!await getIdentityRepository().getUserByApplicationId(value.applicationUserId))return null;return{applicationUserId:value.applicationUserId,provider:"FUTFORGE",scope:value.scope,clientType:value.clientType}}catch{}
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return null;
  try{const response=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,authorization:`Bearer ${token}`},cache:"no-store"});if(!response.ok)return null;const user=await response.json() as{id?:unknown};if(typeof user.id!=="string")return null;const profile=await getIdentityRepository().getUserByLegacySupabaseId(user.id);return profile?{applicationUserId:profile.id,provider:"SUPABASE",scope:["legacy"],clientType:null}:null}catch{return null}
}
