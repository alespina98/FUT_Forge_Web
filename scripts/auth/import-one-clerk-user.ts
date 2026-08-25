import { readFile } from "node:fs/promises";
import { clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
type Input={email:string;username:string;legacySupabaseUserId:string;passwordDigest:string};
const file=process.argv[2];if(!file)throw new Error("Pass a protected JSON input path");
const row=JSON.parse(await readFile(file,"utf8")) as Input;
if(!/^\$2[aby]\$\d\d\$/.test(row.passwordDigest))throw new Error("The test digest is not bcrypt");
if(!process.env.CLERK_SECRET_KEY)throw new Error("CLERK_SECRET_KEY is required");
const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!supabaseUrl||!serviceRoleKey)throw new Error("Supabase private database credentials are required");
const client=await clerkClient();
const user=await client.users.createUser({emailAddress:[row.email],username:row.username,passwordDigest:row.passwordDigest,passwordHasher:"bcrypt",privateMetadata:{legacySupabaseUserId:row.legacySupabaseUserId,migrationState:"TEST"}});
const database=createClient(supabaseUrl,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
const {error}=await database.rpc("map_existing_clerk_identity",{p_clerk_user_id:user.id,p_legacy_supabase_user_id:row.legacySupabaseUserId});
if(error){await client.users.deleteUser(user.id).catch(()=>undefined);throw new Error("Legacy mapping failed; the Clerk import was reconciled")}
process.stdout.write("Created and mapped one controlled Clerk bcrypt migration user; digest and identity data were not logged.\n");
