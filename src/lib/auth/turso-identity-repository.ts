import { randomUUID } from "node:crypto";
import { createClient, type Client, type Row } from "@libsql/client";
import type { CreateApplicationUserInput, IdentityProfile, IdentityRepository, UserRole, UserTier } from "./identity-repository";
const QUERY_TIMEOUT_MS=10_000;
export const normalizeUsername=(value:string)=>value.trim();
export const normalizeEmail=(value:string)=>value.trim().toLowerCase();
export const validUsername=(value:string)=>{const v=normalizeUsername(value);return v.length>=3&&v.length<=32&&/^[\p{L}\p{N}_.-]+$/u.test(v)};
function bounded<T>(operation:Promise<T>):Promise<T>{let timer:ReturnType<typeof setTimeout>;return Promise.race([operation,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error("Identity database timed out")),QUERY_TIMEOUT_MS)})]).finally(()=>clearTimeout(timer))}
function profile(row:Row|undefined):IdentityProfile|null{if(!row)return null;return{id:String(row.id),email:String(row.email),username:String(row.username),role:String(row.role) as UserRole,tier:String(row.tier) as UserTier,created_at:String(row.created_at),updated_at:String(row.updated_at),legacy_supabase_user_id:row.legacy_supabase_user_id==null?null:String(row.legacy_supabase_user_id)}}
export class TursoIdentityRepository implements IdentityRepository {
  private readonly client:Client;
  constructor(client:Client){this.client=client}
  async getUserByClerkId(clerkUserId:string){const r=await bounded(this.client.execute({sql:`SELECT u.* FROM app_users u JOIN auth_identity_mapping m ON m.application_user_id=u.id WHERE m.clerk_user_id=? AND m.migration_state='ACTIVE'`,args:[clerkUserId]}));return profile(r.rows[0])}
  async getUserByApplicationId(id:string){const r=await bounded(this.client.execute({sql:"SELECT * FROM app_users WHERE id=?",args:[id]}));return profile(r.rows[0])}
  async isUsernameAvailable(username:string){if(!validUsername(username))return false;const r=await bounded(this.client.execute({sql:"SELECT 1 FROM app_users WHERE username_normalized=? LIMIT 1",args:[normalizeUsername(username).toLowerCase()]}));return r.rows.length===0}
  async createApplicationUser(input:CreateApplicationUserInput){if(!validUsername(input.username)||!input.clerkUserId.trim()||!normalizeEmail(input.email))throw new Error("Invalid identity profile");const id=input.applicationUserId??randomUUID();const now=input.createdAt??new Date().toISOString();const username=normalizeUsername(input.username);const email=normalizeEmail(input.email);await bounded(this.client.batch([
    {sql:"INSERT INTO app_users(id,email,email_normalized,username,username_normalized,role,tier,created_at,updated_at,legacy_supabase_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)",args:[id,email,email,username,username.toLowerCase(),input.role??"USER",input.tier??"FREE",now,now,input.legacySupabaseUserId??null]},
    {sql:"INSERT INTO auth_identity_mapping(clerk_user_id,application_user_id,migration_state,created_at,migrated_at) VALUES(?,?,?,?,?)",args:[input.clerkUserId,id,"ACTIVE",now,now]},
  ],"write"));return id}
  async mapClerkIdentity(clerkUserId:string,applicationUserId:string,migrationState:"PENDING"|"ACTIVE"|"FAILED"="ACTIVE"){const now=new Date().toISOString();await bounded(this.client.execute({sql:"INSERT INTO auth_identity_mapping(clerk_user_id,application_user_id,migration_state,created_at,migrated_at) VALUES(?,?,?,?,?)",args:[clerkUserId,applicationUserId,migrationState,now,migrationState==="ACTIVE"?now:null]}))}
  async getRole(clerkUserId:string){return(await this.getUserByClerkId(clerkUserId))?.role??null}
  async getTier(clerkUserId:string){return(await this.getUserByClerkId(clerkUserId))?.tier??null}
  async updateProfile(clerkUserId:string,input:{username:string}){if(!validUsername(input.username))throw new Error("Invalid username");const user=await this.getUserByClerkId(clerkUserId);if(!user)throw new Error("Profile not found");const username=normalizeUsername(input.username);await bounded(this.client.execute({sql:"UPDATE app_users SET username=?,username_normalized=?,updated_at=? WHERE id=?",args:[username,username.toLowerCase(),new Date().toISOString(),user.id]}))}
}
let singleton:TursoIdentityRepository|undefined;
export function getIdentityRepository(){if(singleton)return singleton;const url=process.env.TURSO_DATABASE_URL;if(!url)throw new Error("TURSO_DATABASE_URL is required");const authToken=process.env.TURSO_AUTH_TOKEN;if(!url.startsWith("file:")&&!authToken)throw new Error("TURSO_AUTH_TOKEN is required");singleton=new TursoIdentityRepository(createClient({url,authToken}));return singleton}
