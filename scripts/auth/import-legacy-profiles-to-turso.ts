import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

type LegacyProfile={application_user_id:string;email:string;username:string;role?:"USER"|"ADMIN";tier?:"FREE"|"PREMIUM";created_at:string;clerk_user_id?:string};
const inputPath=process.argv[2];
if(!inputPath)throw new Error("Usage: import-legacy-profiles-to-turso.ts <protected-export.json>");
const rows=JSON.parse(await readFile(inputPath,"utf8")) as LegacyProfile[];
const counts=new Map<string,number>();
const count=(key:string)=>counts.set(key,(counts.get(key)??0)+1);
for(const row of rows){count(`u:${row.username?.trim().toLowerCase()}`);count(`e:${row.email?.trim().toLowerCase()}`)}
const issues=rows.flatMap((row,index)=>{
  const found:string[]=[];
  if(!row.application_user_id)found.push("missing application UUID");
  if(!row.username?.trim())found.push("missing username");
  if(!row.email?.trim())found.push("missing email");
  if((counts.get(`u:${row.username?.trim().toLowerCase()}`)??0)>1)found.push("duplicate normalized username");
  if((counts.get(`e:${row.email?.trim().toLowerCase()}`)??0)>1)found.push("duplicate normalized email");
  return found.map(issue=>({row:index+1,issue}));
});
if(issues.length){console.error(JSON.stringify({status:"RECONCILIATION_REQUIRED",rowCount:rows.length,issues},null,2));process.exitCode=2}else{
  const url=process.env.TURSO_DATABASE_URL,authToken=process.env.TURSO_AUTH_TOKEN;
  if(!url)throw new Error("TURSO_DATABASE_URL is required");if(!url.startsWith("file:")&&!authToken)throw new Error("TURSO_AUTH_TOKEN is required");
  const client=createClient({url,authToken});
  for(const row of rows){const email=row.email.trim().toLowerCase(),username=row.username.trim();await client.batch([
    {sql:"INSERT INTO app_users(id,email,email_normalized,username,username_normalized,role,tier,created_at,updated_at,legacy_supabase_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)",args:[row.application_user_id,email,email,username,username.toLowerCase(),row.role??"USER",row.tier??"FREE",row.created_at,row.created_at,row.application_user_id]},
    ...(row.clerk_user_id?[{sql:"INSERT INTO auth_identity_mapping(clerk_user_id,application_user_id,migration_state,created_at,migrated_at) VALUES(?,?,?,?,?)",args:[row.clerk_user_id,row.application_user_id,"ACTIVE",new Date().toISOString(),new Date().toISOString()]}]:[]),
  ],"write")}
  client.close();console.log(JSON.stringify({status:"IMPORTED",rowCount:rows.length}));
}
