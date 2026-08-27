import "server-only";
// @ts-expect-error TS5097: direct Node test execution requires the extension.
import {getDeviceAuthStore,newDeviceCodes} from "./device-auth-store.ts";
// @ts-expect-error TS5097: direct Node test execution requires the extension.
import {futForgeTokenMetadata,randomToken,sha256,signFutForgeAccessToken,type FutForgeClientType} from "./futforge-token.ts";
// @ts-expect-error TS5097: direct Node test execution requires the extension.
import {getIdentityRepository} from "./turso-identity-repository.ts";

const allowed=new Set<FutForgeClientType>(["desktop","android","extension","browser"]);
const scopes=["identity:read"];
const canonicalUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function controlledApplicationUserIds(){return new Set((process.env.AUTH_BRIDGE_TEST_USER_IDS??"").split(",").map(value=>value.trim()).filter(value=>canonicalUuid.test(value)))}
export function deviceBridgeEnabled(){return process.env.AUTH_BRIDGE_ENABLED==="true"&&(process.env.FUT_FORGE_TOKEN_SECRET?.length??0)>=32&&controlledApplicationUserIds().size>0}
export function isControlledApplicationUserId(applicationUserId:string){return controlledApplicationUserIds().has(applicationUserId)}
async function controlledProfile(clerkUserId:string){const profile=await getIdentityRepository().getUserByClerkId(clerkUserId);if(!profile)throw new Error("ACTIVE_MAPPING_REQUIRED");if(!isControlledApplicationUserId(profile.id))throw new Error("OWNER_ONLY");return profile}
export async function isControlledClerkUser(clerkUserId:string){try{await controlledProfile(clerkUserId);return true}catch{return false}}
export function parseClientType(value:unknown):FutForgeClientType|null{return typeof value==="string"&&allowed.has(value as FutForgeClientType)?value as FutForgeClientType:null}
export function normalizeUserCode(value:unknown){return typeof value==="string"?value.trim().toUpperCase().replace(/[^A-Z0-9]/g,"").replace(/^(.{4})(.{4})$/,"$1-$2"):""}
export async function requesterFingerprint(request:Request){const forwarded=request.headers.get("cf-connecting-ip")||request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";return sha256(`${forwarded}:${process.env.FUT_FORGE_TOKEN_SECRET??""}`)}
export async function enforceDeviceRate(kind:"token"|"refresh"|"logout",requesterHash:string){const limits={token:150,refresh:30,logout:30};if(!await getDeviceAuthStore().rateLimit(`${kind}:${requesterHash}`,limits[kind],600))throw new Error("RATE_LIMITED")}
export async function startDeviceAuthorization(input:{clientType:FutForgeClientType;clientVersion:string|null;requesterHash:string},origin:string){
  const store=getDeviceAuthStore();if(!await store.rateLimit(`start:${input.requesterHash}`,10,600))throw new Error("RATE_LIMITED");const codes=await newDeviceCodes();const created=await store.create({...codes,clientType:input.clientType,clientVersion:input.clientVersion,requesterHash:input.requesterHash});await store.event("START",input.clientType);const verificationUri=`${origin}/device`;return{device_code:codes.deviceCode,user_code:codes.userCode,verification_uri:verificationUri,verification_uri_complete:`${verificationUri}?code=${encodeURIComponent(codes.userCode)}`,expires_in:Math.round((created.expiresAt.getTime()-Date.now())/1000),interval:created.pollInterval};
}
export async function getDeviceApproval(userCode:string,clerkUserId:string){const store=getDeviceAuthStore();if(!await store.rateLimit(`lookup:${clerkUserId}`,30,600))throw new Error("RATE_LIMITED");await controlledProfile(clerkUserId);return store.getByUserCode(normalizeUserCode(userCode))}
export async function decideDeviceAuthorization(input:{userCode:string;clerkUserId:string;action:"APPROVE"|"DENY"}){
  const store=getDeviceAuthStore(),code=normalizeUserCode(input.userCode);if(!await store.rateLimit(`approval:${input.clerkUserId}`,20,600))throw new Error("RATE_LIMITED");const profile=await controlledProfile(input.clerkUserId),applicationUserId=input.action==="APPROVE"?profile.id:null;const result=await store.decide(code,input.clerkUserId,applicationUserId,input.action);if(!result)throw new Error("NOT_PENDING");await store.event(input.action==="APPROVE"?"APPROVE":"DENY",result.clientType);return result;
}
async function issue(applicationUserId:string,clientType:FutForgeClientType){const store=getDeviceAuthStore(),refreshToken=randomToken(32),familyId=crypto.randomUUID();await store.createRefresh({tokenHash:await sha256(refreshToken),familyId,applicationUserId,clientType,scope:scopes.join(" ")});return{access_token:await signFutForgeAccessToken({applicationUserId,clientType,scope:scopes}),token_type:"Bearer",expires_in:futForgeTokenMetadata.accessTokenLifetimeSeconds,refresh_token:refreshToken,scope:scopes.join(" ")}}
export async function pollDeviceAuthorization(deviceCode:string){
  const store=getDeviceAuthStore(),polled=await store.poll(await sha256(deviceCode));if(polled.kind!=="approved")return polled;const approved=polled.authorization!;if(!approved.applicationUserId||!isControlledApplicationUserId(approved.applicationUserId)){await store.rejectApproved(approved.id);await store.event("DENY",approved.clientType);return{kind:"denied" as const}}const consumed=await store.consume(approved.id);if(!consumed?.applicationUserId)return{kind:"consumed" as const};const tokens=await issue(consumed.applicationUserId,consumed.clientType);await store.event("TOKEN_SUCCESS",consumed.clientType);return{kind:"tokens" as const,tokens};
}
export async function refreshDeviceSession(refreshToken:string){const store=getDeviceAuthStore(),next=randomToken(32),rotated=await store.rotateRefresh(await sha256(refreshToken),await sha256(next));if(rotated.kind!=="rotated"){await store.event("REFRESH_FAILURE",null);return rotated}const accessToken=await signFutForgeAccessToken({applicationUserId:rotated.applicationUserId,clientType:rotated.clientType,scope:rotated.scope});await store.event("REFRESH_SUCCESS",rotated.clientType);return{kind:"tokens" as const,tokens:{access_token:accessToken,token_type:"Bearer",expires_in:futForgeTokenMetadata.accessTokenLifetimeSeconds,refresh_token:next,scope:rotated.scope.join(" ")}}
}
export async function revokeDeviceSession(refreshToken:string){const result=await getDeviceAuthStore().revokeFamily(await sha256(refreshToken));await getDeviceAuthStore().event("LOGOUT",null);return result}
