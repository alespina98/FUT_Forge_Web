import "server-only";

export type FutForgeClientType="desktop"|"android"|"extension"|"browser";
export type FutForgeTokenContext={applicationUserId:string;scope:string[];clientType:FutForgeClientType;jti:string;issuedAt:number;expiresAt:number;tokenVersion:1};
const ISSUER="https://futforgeofficial.com";
const AUDIENCE="futforge-legacy-clients";
const encoder=new TextEncoder();
const b64url=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
const fromB64url=(value:string)=>Uint8Array.from(atob(value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length/4)*4,"=")),c=>c.charCodeAt(0));
const signingSecret=()=>{const value=process.env.FUT_FORGE_TOKEN_SECRET;if(!value||value.length<32)throw new Error("FUT_FORGE_TOKEN_SECRET must contain at least 32 characters");return value};
async function key(){return crypto.subtle.importKey("raw",encoder.encode(signingSecret()),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"])}
export async function sha256(value:string){return b64url(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(value))))}
export function randomToken(bytes=32){const value=new Uint8Array(bytes);crypto.getRandomValues(value);return b64url(value)}
export async function signFutForgeAccessToken(input:{applicationUserId:string;scope:string[];clientType:FutForgeClientType},now=Math.floor(Date.now()/1000)){
  const header=b64url(encoder.encode(JSON.stringify({alg:"HS256",typ:"JWT"}))),jti=crypto.randomUUID();
  const payload=b64url(encoder.encode(JSON.stringify({iss:ISSUER,sub:input.applicationUserId,aud:AUDIENCE,iat:now,exp:now+900,jti,scope:input.scope.join(" "),client_type:input.clientType,token_version:1})));
  const unsigned=`${header}.${payload}`,signature=b64url(new Uint8Array(await crypto.subtle.sign("HMAC",await key(),encoder.encode(unsigned))));return`${unsigned}.${signature}`;
}
export async function verifyFutForgeAccessToken(token:string,requiredScope?:string,now=Math.floor(Date.now()/1000)):Promise<FutForgeTokenContext>{
  const parts=token.split(".");if(parts.length!==3)throw new Error("INVALID_TOKEN");
  if(parts.some(part=>b64url(fromB64url(part))!==part))throw new Error("INVALID_TOKEN");
  let header:Record<string,unknown>;try{header=JSON.parse(new TextDecoder().decode(fromB64url(parts[0])))}catch{throw new Error("INVALID_TOKEN")};if(header.alg!=="HS256"||header.typ!=="JWT")throw new Error("INVALID_TOKEN");
  const valid=await crypto.subtle.verify("HMAC",await key(),fromB64url(parts[2]),encoder.encode(`${parts[0]}.${parts[1]}`));if(!valid)throw new Error("INVALID_TOKEN");
  let value:Record<string,unknown>;try{value=JSON.parse(new TextDecoder().decode(fromB64url(parts[1])))}catch{throw new Error("INVALID_TOKEN")}
  if(value.iss!==ISSUER||value.aud!==AUDIENCE||value.token_version!==1||typeof value.sub!=="string"||typeof value.jti!=="string"||typeof value.iat!=="number"||typeof value.exp!=="number"||value.exp<=now||value.iat>now+60)throw new Error("INVALID_TOKEN");
  if(!["desktop","android","extension","browser"].includes(String(value.client_type)))throw new Error("INVALID_TOKEN");const scope=String(value.scope??"").split(" ").filter(Boolean);if(requiredScope&&!scope.includes(requiredScope))throw new Error("INSUFFICIENT_SCOPE");
  return{applicationUserId:value.sub,scope,clientType:value.client_type as FutForgeClientType,jti:value.jti,issuedAt:value.iat,expiresAt:value.exp,tokenVersion:1};
}
export const futForgeTokenMetadata={issuer:ISSUER,audience:AUDIENCE,accessTokenLifetimeSeconds:900,refreshLifetimeSeconds:30*24*60*60};
