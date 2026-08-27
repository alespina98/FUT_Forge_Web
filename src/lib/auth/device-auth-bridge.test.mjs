import assert from "node:assert/strict";
import {readFile,mkdtemp} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {createClient} from "@libsql/client";

const directory=await mkdtemp(path.join(os.tmpdir(),"futforge-device-auth-"));
const databasePath=path.join(directory,"identity.db");
const ACTIVE_ID="11111111-1111-4111-8111-111111111111",RECOVERY_ID="22222222-2222-4222-8222-222222222222",OUTSIDER_ID="33333333-3333-4333-8333-333333333333";
process.env.TURSO_DATABASE_URL=`file:${databasePath}`;
process.env.FUT_FORGE_TOKEN_SECRET="test-only-secret-with-at-least-thirty-two-characters";
process.env.AUTH_BRIDGE_ENABLED="true";
process.env.AUTH_BRIDGE_TEST_USER_IDS=ACTIVE_ID;
process.env.NEXT_PUBLIC_SUPABASE_URL="https://supabase.example.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY="publishable-test-key";
const setup=createClient({url:process.env.TURSO_DATABASE_URL});
for(const name of ["0001_website_identity.sql","0002_password_recovery_state.sql","0003_admin_control_plane.sql","0004_device_auth_bridge.sql"])await setup.executeMultiple(await readFile(new URL(`../../../turso/migrations/${name}`,import.meta.url),"utf8"));
const now=new Date().toISOString();
await setup.batch([
  {sql:"INSERT INTO app_users(id,email,email_normalized,username,username_normalized,role,tier,created_at,updated_at,legacy_supabase_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)",args:[ACTIVE_ID,"active@example.com","active@example.com","ActiveUser","activeuser","USER","FREE",now,now,"legacy-active"]},
  {sql:"INSERT INTO auth_identity_mapping(clerk_user_id,application_user_id,migration_state,created_at,migrated_at) VALUES(?,?,?,?,?)",args:["clerk-active",ACTIVE_ID,"ACTIVE",now,now]},
  {sql:"INSERT INTO app_users(id,email,email_normalized,username,username_normalized,role,tier,created_at,updated_at,legacy_supabase_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)",args:[RECOVERY_ID,"recovery@example.com","recovery@example.com","Recovery","recovery","USER","FREE",now,now,"legacy-recovery"]},
  {sql:"INSERT INTO auth_identity_mapping(clerk_user_id,application_user_id,migration_state,created_at,migrated_at) VALUES(?,?,?,?,?)",args:["clerk-recovery",RECOVERY_ID,"PASSWORD_RECOVERY_REQUIRED",now,null]},
  {sql:"INSERT INTO app_users(id,email,email_normalized,username,username_normalized,role,tier,created_at,updated_at,legacy_supabase_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)",args:[OUTSIDER_ID,"outside@example.com","outside@example.com","Outsider","outsider","USER","FREE",now,now,"legacy-outsider"]},
  {sql:"INSERT INTO auth_identity_mapping(clerk_user_id,application_user_id,migration_state,created_at,migrated_at) VALUES(?,?,?,?,?)",args:["clerk-outsider",OUTSIDER_ID,"ACTIVE",now,now]},
],"write");
const service=await import("./device-auth-service.ts");
const tokens=await import("./futforge-token.ts");
const identityResolver=await import("./request-identity.ts");

test("device flow remains pending, approves ACTIVE mapping, and consumes exactly once",async()=>{
  const challenge=await service.startDeviceAuthorization({clientType:"desktop",clientVersion:"test",requesterHash:"requester-a"},"https://example.test");
  assert.match(challenge.user_code,/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);assert.equal((await service.pollDeviceAuthorization(challenge.device_code)).kind,"pending");
  await service.decideDeviceAuthorization({userCode:challenge.user_code,clerkUserId:"clerk-active",action:"APPROVE"});
  const issued=await service.pollDeviceAuthorization(challenge.device_code);assert.equal(issued.kind,"tokens");assert.equal((await tokens.verifyFutForgeAccessToken(issued.tokens.access_token,"identity:read")).applicationUserId,ACTIVE_ID);
  assert.equal((await service.pollDeviceAuthorization(challenge.device_code)).kind,"consumed");
});

test("denial and expired requests fail closed",async()=>{
  const denied=await service.startDeviceAuthorization({clientType:"desktop",clientVersion:null,requesterHash:"requester-b"},"https://example.test");await service.decideDeviceAuthorization({userCode:denied.user_code,clerkUserId:"clerk-active",action:"DENY"});assert.equal((await service.pollDeviceAuthorization(denied.device_code)).kind,"denied");
  const expired=await service.startDeviceAuthorization({clientType:"desktop",clientVersion:null,requesterHash:"requester-c"},"https://example.test");await setup.execute({sql:"UPDATE device_authorizations SET expires_at=? WHERE user_code=?",args:["2000-01-01T00:00:00.000Z",expired.user_code]});assert.equal((await service.pollDeviceAuthorization(expired.device_code)).kind,"expired");
});

test("PASSWORD_RECOVERY_REQUIRED and missing mappings cannot approve",async()=>{
  const challenge=await service.startDeviceAuthorization({clientType:"desktop",clientVersion:null,requesterHash:"requester-d"},"https://example.test");
  await assert.rejects(()=>service.decideDeviceAuthorization({userCode:challenge.user_code,clerkUserId:"clerk-recovery",action:"APPROVE"}),/ACTIVE_MAPPING_REQUIRED/);
  await assert.rejects(()=>service.decideDeviceAuthorization({userCode:challenge.user_code,clerkUserId:"missing",action:"APPROVE"}),/ACTIVE_MAPPING_REQUIRED/);
});

test("controlled rollout rejects an ACTIVE user outside the canonical UUID allowlist",async()=>{
  const challenge=await service.startDeviceAuthorization({clientType:"desktop",clientVersion:null,requesterHash:"requester-owner-guard"},"https://example.test");
  await assert.rejects(()=>service.getDeviceApproval(challenge.user_code,"clerk-outsider"),/OWNER_ONLY/);
  await assert.rejects(()=>service.decideDeviceAuthorization({userCode:challenge.user_code,clerkUserId:"clerk-outsider",action:"APPROVE"}),/OWNER_ONLY/);
});

test("browser handoff accepts any ACTIVE canonical Clerk mapping and consumes its secret once",async()=>{
  const challenge=await service.startDeviceAuthorization({clientType:"browser",clientVersion:null,requesterHash:"browser-active"},"https://futforgeofficial.com");
  const raw=await setup.execute({sql:"SELECT device_code_hash, application_user_id FROM device_authorizations WHERE user_code=?",args:[challenge.user_code]});
  assert.notEqual(raw.rows[0].device_code_hash,challenge.device_code,"the authorization secret must be stored hashed");
  await service.approveBrowserAuthorization(challenge.user_code,"clerk-outsider");
  const issued=await service.pollBrowserAuthorization(challenge.device_code);
  assert.equal(issued.kind,"tokens");
  const claims=await tokens.verifyFutForgeAccessToken(issued.tokens.access_token,"identity:read");
  assert.equal(claims.applicationUserId,OUTSIDER_ID);
  assert.equal(claims.clientType,"browser");
  assert.equal((await service.pollBrowserAuthorization(challenge.device_code)).kind,"consumed");
});

test("browser handoff rejects non-ACTIVE Clerk mappings and non-browser challenges",async()=>{
  const browser=await service.startDeviceAuthorization({clientType:"browser",clientVersion:null,requesterHash:"browser-recovery"},"https://futforgeofficial.com");
  await assert.rejects(()=>service.approveBrowserAuthorization(browser.user_code,"clerk-recovery"),/ACTIVE_MAPPING_REQUIRED/);
  const desktop=await service.startDeviceAuthorization({clientType:"desktop",clientVersion:null,requesterHash:"browser-cross-client"},"https://futforgeofficial.com");
  await assert.rejects(()=>service.approveBrowserAuthorization(desktop.user_code,"clerk-active"),/NOT_PENDING/);
});

test("browser refresh rotates, rejects reuse, and logout revokes the active replacement",async()=>{
  const challenge=await service.startDeviceAuthorization({clientType:"browser",clientVersion:null,requesterHash:"browser-refresh"},"https://futforgeofficial.com");
  await service.approveBrowserAuthorization(challenge.user_code,"clerk-active");
  const issued=await service.pollBrowserAuthorization(challenge.device_code),old=issued.tokens.refresh_token;
  const rotated=await service.refreshBrowserSession(old);
  assert.equal(rotated.kind,"tokens");
  assert.equal((await service.refreshBrowserSession(old)).kind,"reuse");
  assert.notEqual((await service.refreshBrowserSession(rotated.tokens.refresh_token)).kind,"tokens");
  const logoutChallenge=await service.startDeviceAuthorization({clientType:"browser",clientVersion:null,requesterHash:"browser-logout"},"https://futforgeofficial.com");
  await service.approveBrowserAuthorization(logoutChallenge.user_code,"clerk-active");
  const logoutIssued=await service.pollBrowserAuthorization(logoutChallenge.device_code);
  assert.equal(await service.revokeBrowserSession(logoutIssued.tokens.refresh_token),true);
  assert.notEqual((await service.refreshBrowserSession(logoutIssued.tokens.refresh_token)).kind,"tokens");
});

test("poll interval and start rate controls are enforced",async()=>{
  const challenge=await service.startDeviceAuthorization({clientType:"desktop",clientVersion:null,requesterHash:"requester-rate"},"https://example.test");assert.equal((await service.pollDeviceAuthorization(challenge.device_code)).kind,"pending");assert.equal((await service.pollDeviceAuthorization(challenge.device_code)).kind,"slow_down");
  const pending=[];for(let i=0;i<3;i++)pending.push(await service.startDeviceAuthorization({clientType:"android",clientVersion:null,requesterHash:"pending-limit"},"https://example.test"));
  await assert.rejects(()=>service.startDeviceAuthorization({clientType:"android",clientVersion:null,requesterHash:"pending-limit"},"https://example.test"),/TOO_MANY_PENDING/);
  for(let i=0;i<10;i++){const item=await service.startDeviceAuthorization({clientType:"android",clientVersion:null,requesterHash:"limited"},"https://example.test");await service.decideDeviceAuthorization({userCode:item.user_code,clerkUserId:"clerk-active",action:"DENY"})}
  await assert.rejects(()=>service.startDeviceAuthorization({clientType:"android",clientVersion:null,requesterHash:"limited"},"https://example.test"),/RATE_LIMITED/);
});

test("tokens reject expiration, tampering, wrong scope, audience, and issuer",async()=>{
  const expired=await tokens.signFutForgeAccessToken({applicationUserId:ACTIVE_ID,clientType:"desktop",scope:["identity:read"]},1);await assert.rejects(()=>tokens.verifyFutForgeAccessToken(expired),/INVALID_TOKEN/);
  const valid=await tokens.signFutForgeAccessToken({applicationUserId:ACTIVE_ID,clientType:"desktop",scope:["identity:read"]});await assert.rejects(()=>tokens.verifyFutForgeAccessToken(valid.slice(0,-1)+"x"),/INVALID_TOKEN/);await assert.rejects(()=>tokens.verifyFutForgeAccessToken(valid,"club:sync"),/INSUFFICIENT_SCOPE/);
  async function forged(overrides){const encoder=new TextEncoder(),b64=bytes=>Buffer.from(bytes).toString("base64url"),header=b64(encoder.encode(JSON.stringify({alg:"HS256",typ:"JWT"}))),now=Math.floor(Date.now()/1000),payload=b64(encoder.encode(JSON.stringify({iss:"https://futforgeofficial.com",sub:ACTIVE_ID,aud:"futforge-legacy-clients",iat:now,exp:now+60,jti:"jti",scope:"identity:read",client_type:"desktop",token_version:1,...overrides}))),key=await crypto.subtle.importKey("raw",encoder.encode(process.env.FUT_FORGE_TOKEN_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]),signature=await crypto.subtle.sign("HMAC",key,encoder.encode(`${header}.${payload}`));return`${header}.${payload}.${b64(new Uint8Array(signature))}`}
  const wrongAudience=await forged({aud:"wrong"}),wrongIssuer=await forged({iss:"wrong"});await assert.rejects(()=>tokens.verifyFutForgeAccessToken(wrongAudience),/INVALID_TOKEN/);await assert.rejects(()=>tokens.verifyFutForgeAccessToken(wrongIssuer),/INVALID_TOKEN/);
});

test("refresh rotates, detects reuse, and revokes the replacement family",async()=>{
  const challenge=await service.startDeviceAuthorization({clientType:"desktop",clientVersion:null,requesterHash:"requester-refresh"},"https://example.test");await service.decideDeviceAuthorization({userCode:challenge.user_code,clerkUserId:"clerk-active",action:"APPROVE"});const issued=await service.pollDeviceAuthorization(challenge.device_code),old=issued.tokens.refresh_token;
  const rotated=await service.refreshDeviceSession(old);assert.equal(rotated.kind,"tokens");assert.equal((await service.refreshDeviceSession(old)).kind,"reuse");assert.notEqual((await service.refreshDeviceSession(rotated.tokens.refresh_token)).kind,"tokens");
});

test("FUT Forge and legacy Supabase tokens resolve to the same canonical UUID",async()=>{
  const access=await tokens.signFutForgeAccessToken({applicationUserId:ACTIVE_ID,clientType:"desktop",scope:["identity:read"]});
  const bridge=await identityResolver.resolveRequestIdentity(new Request("https://example.test",{headers:{authorization:`Bearer ${access}`}}),"identity:read");
  const originalFetch=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({id:"legacy-active"}),{status:200,headers:{"content-type":"application/json"}});
  try{const legacy=await identityResolver.resolveRequestIdentity(new Request("https://example.test",{headers:{authorization:"Bearer legacy-supabase-token"}}));assert.equal(bridge.applicationUserId,ACTIVE_ID);assert.equal(legacy.applicationUserId,bridge.applicationUserId);assert.equal(legacy.provider,"SUPABASE")}finally{globalThis.fetch=originalFetch}
});

test.after(async()=>setup.close());
