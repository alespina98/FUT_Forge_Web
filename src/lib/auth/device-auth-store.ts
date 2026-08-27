import "server-only";
import {createClient,type Client,type Row} from "@libsql/client";
// @ts-expect-error TS5097: direct Node test execution requires the extension.
import {randomToken,sha256,type FutForgeClientType} from "./futforge-token.ts";

export type DeviceStatus="PENDING"|"APPROVED"|"DENIED"|"EXPIRED"|"CONSUMED";
export type DeviceAuthorization={id:string;userCode:string;clientType:FutForgeClientType;clientVersion:string|null;status:DeviceStatus;applicationUserId:string|null;clerkUserId:string|null;expiresAt:string;pollInterval:number;lastPolledAt:string|null};
const iso=(date=new Date())=>date.toISOString();
function device(row:Row):DeviceAuthorization{return{id:String(row.id),userCode:String(row.user_code),clientType:String(row.client_type) as FutForgeClientType,clientVersion:row.client_version==null?null:String(row.client_version),status:String(row.status) as DeviceStatus,applicationUserId:row.application_user_id==null?null:String(row.application_user_id),clerkUserId:row.clerk_user_id==null?null:String(row.clerk_user_id),expiresAt:String(row.expires_at),pollInterval:Number(row.poll_interval),lastPolledAt:row.last_polled_at==null?null:String(row.last_polled_at)}}
export class DeviceAuthStore{
  private readonly client:Client;
  constructor(client:Client){this.client=client}
  async rateLimit(key:string,limit:number,windowSeconds:number,now=new Date()){
    const windowStart=new Date(now.getTime()-windowSeconds*1000).toISOString(),current=iso(now);
    const result=await this.client.execute({sql:`INSERT INTO device_auth_rate_limits(rate_key,window_started_at,attempts) VALUES(?,?,1) ON CONFLICT(rate_key) DO UPDATE SET window_started_at=CASE WHEN window_started_at<? THEN excluded.window_started_at ELSE window_started_at END,attempts=CASE WHEN window_started_at<? THEN 1 ELSE attempts+1 END RETURNING attempts`,args:[key,current,windowStart,windowStart]});return Number(result.rows[0]?.attempts??limit+1)<=limit;
  }
  async create(input:{deviceCodeHash:string;userCode:string;clientType:FutForgeClientType;clientVersion:string|null;requesterHash:string},now=new Date()){
    await this.expire(now);const id=crypto.randomUUID(),expiresAt=new Date(now.getTime()+600_000);const result=await this.client.execute({sql:"INSERT INTO device_authorizations(id,device_code_hash,user_code,client_type,client_version,requester_hash,status,created_at,expires_at,poll_interval) SELECT ?,?,?,?,?,?,'PENDING',?,?,5 WHERE (SELECT COUNT(*) FROM device_authorizations WHERE requester_hash=? AND status='PENDING' AND expires_at>?)<3",args:[id,input.deviceCodeHash,input.userCode,input.clientType,input.clientVersion,input.requesterHash,iso(now),iso(expiresAt),input.requesterHash,iso(now)]});if(result.rowsAffected!==1)throw new Error("TOO_MANY_PENDING");return{id,expiresAt,pollInterval:5};
  }
  async getByUserCode(userCode:string,now=new Date()){await this.expire(now);const result=await this.client.execute({sql:"SELECT * FROM device_authorizations WHERE user_code=?",args:[userCode]});return result.rows[0]?device(result.rows[0]):null}
  async decide(userCode:string,clerkUserId:string,applicationUserId:string|null,action:"APPROVE"|"DENY",now=new Date()){
    await this.expire(now);const status=action==="APPROVE"?"APPROVED":"DENIED",result=await this.client.execute({sql:"UPDATE device_authorizations SET status=?,application_user_id=?,clerk_user_id=?,approved_at=? WHERE user_code=? AND status='PENDING' AND expires_at>? RETURNING *",args:[status,applicationUserId,clerkUserId,iso(now),userCode,iso(now)]});return result.rows[0]?device(result.rows[0]):null;
  }
  async poll(deviceCodeHash:string,now=new Date()):Promise<{kind:"invalid"|"pending"|"slow_down"|"denied"|"expired"|"consumed"|"approved";authorization?:DeviceAuthorization}>{
    await this.expire(now);const result=await this.client.execute({sql:"SELECT * FROM device_authorizations WHERE device_code_hash=?",args:[deviceCodeHash]});if(!result.rows[0])return{kind:"invalid"};const value=device(result.rows[0]);
    if(value.status==="PENDING"){const tooFast=value.lastPolledAt!==null&&now.getTime()-new Date(value.lastPolledAt).getTime()<value.pollInterval*1000;await this.client.execute({sql:"UPDATE device_authorizations SET last_polled_at=?,poll_attempts=poll_attempts+1 WHERE id=?",args:[iso(now),value.id]});return{kind:tooFast?"slow_down":"pending"}}
    return{kind:value.status.toLowerCase() as "denied"|"expired"|"consumed"|"approved",authorization:value};
  }
  async consume(id:string,now=new Date()){const result=await this.client.execute({sql:"UPDATE device_authorizations SET status='CONSUMED',consumed_at=? WHERE id=? AND status='APPROVED' AND expires_at>? RETURNING *",args:[iso(now),id,iso(now)]});return result.rows[0]?device(result.rows[0]):null}
  async rejectApproved(id:string){const result=await this.client.execute({sql:"UPDATE device_authorizations SET status='DENIED' WHERE id=? AND status='APPROVED' RETURNING *",args:[id]});return result.rows[0]?device(result.rows[0]):null}
  async createRefresh(input:{tokenHash:string;familyId:string;applicationUserId:string;clientType:FutForgeClientType;scope:string},now=new Date()){const id=crypto.randomUUID();await this.client.execute({sql:"INSERT INTO device_refresh_tokens(id,token_hash,family_id,application_user_id,client_type,scope,status,created_at,expires_at) VALUES(?,?,?,?,?,?,'ACTIVE',?,?)",args:[id,input.tokenHash,input.familyId,input.applicationUserId,input.clientType,input.scope,iso(now),iso(new Date(now.getTime()+30*24*60*60*1000))]});return id}
  async rotateRefresh(oldHash:string,newHash:string,now=new Date(),expectedClientType?:FutForgeClientType){
    const transaction=await this.client.transaction("write");
    try{const found=await transaction.execute({sql:"SELECT * FROM device_refresh_tokens WHERE token_hash=?",args:[oldHash]});const row=found.rows[0];if(!row||expectedClientType&&String(row.client_type)!==expectedClientType){await transaction.rollback();return{kind:"invalid" as const}}const familyId=String(row.family_id);
      if(String(row.status)!=="ACTIVE"){await transaction.execute({sql:"UPDATE device_refresh_tokens SET status='REUSED',revoked_at=? WHERE id=? AND status='ROTATED'",args:[iso(now),String(row.id)]});await transaction.execute({sql:"UPDATE device_refresh_tokens SET status='REVOKED',revoked_at=? WHERE family_id=? AND status='ACTIVE'",args:[iso(now),familyId]});await transaction.commit();return{kind:"reuse" as const}}
      if(new Date(String(row.expires_at)).getTime()<=now.getTime()){await transaction.rollback();return{kind:"expired" as const}}
      const newId=crypto.randomUUID(),updated=await transaction.execute({sql:"UPDATE device_refresh_tokens SET status='ROTATED',rotated_at=?,replaced_by=? WHERE id=? AND status='ACTIVE'",args:[iso(now),newId,String(row.id)]});if(updated.rowsAffected!==1){await transaction.rollback();throw new Error("REFRESH_RACE")}
      await transaction.execute({sql:"INSERT INTO device_refresh_tokens(id,token_hash,family_id,application_user_id,client_type,scope,status,created_at,expires_at) VALUES(?,?,?,?,?,?,'ACTIVE',?,?)",args:[newId,newHash,familyId,String(row.application_user_id),String(row.client_type),String(row.scope),iso(now),String(row.expires_at)]});await transaction.commit();return{kind:"rotated" as const,applicationUserId:String(row.application_user_id),clientType:String(row.client_type) as FutForgeClientType,scope:String(row.scope).split(" ").filter(Boolean)}
    }catch(error){try{await transaction.rollback()}catch{}throw error}
  }
  async revokeFamily(tokenHash:string,now=new Date(),expectedClientType?:FutForgeClientType){const found=await this.client.execute({sql:"SELECT family_id,client_type FROM device_refresh_tokens WHERE token_hash=?",args:[tokenHash]});if(!found.rows[0]||expectedClientType&&String(found.rows[0].client_type)!==expectedClientType)return false;await this.client.execute({sql:"UPDATE device_refresh_tokens SET status='REVOKED',revoked_at=? WHERE family_id=? AND status='ACTIVE'",args:[iso(now),String(found.rows[0].family_id)]});return true}
  async event(eventType:string,clientType:FutForgeClientType|null){await this.client.execute({sql:"INSERT INTO device_auth_events(id,event_type,client_type,created_at) VALUES(?,?,?,?)",args:[crypto.randomUUID(),eventType,clientType,iso()]})}
  private async expire(now:Date){await this.client.execute({sql:"UPDATE device_authorizations SET status='EXPIRED' WHERE status IN ('PENDING','APPROVED') AND expires_at<=?",args:[iso(now)]})}
}
let singleton:DeviceAuthStore|undefined;
export function getDeviceAuthStore(){if(singleton)return singleton;const url=process.env.TURSO_DATABASE_URL;if(!url)throw new Error("TURSO_DATABASE_URL is required");const authToken=process.env.TURSO_AUTH_TOKEN;if(!url.startsWith("file:")&&!authToken)throw new Error("TURSO_AUTH_TOKEN is required");singleton=new DeviceAuthStore(createClient({url,authToken}));return singleton}
export async function newDeviceCodes(){const deviceCode=randomToken(32),alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",bytes=crypto.getRandomValues(new Uint8Array(8)),raw=Array.from(bytes,value=>alphabet[value&31]).join("");return{deviceCode,deviceCodeHash:await sha256(deviceCode),userCode:`${raw.slice(0,4)}-${raw.slice(4)}`}}
