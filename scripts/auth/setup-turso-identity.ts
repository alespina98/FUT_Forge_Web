import { readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const url=process.env.TURSO_DATABASE_URL;
const authToken=process.env.TURSO_AUTH_TOKEN;
if(!url)throw new Error("TURSO_DATABASE_URL is required");
if(!url.startsWith("file:")&&!authToken)throw new Error("TURSO_AUTH_TOKEN is required");
const sql=await readFile(new URL("../../turso/migrations/0001_website_identity.sql",import.meta.url),"utf8");
const client=createClient({url,authToken});
await client.executeMultiple(sql);
client.close();
console.log("Turso website identity schema is ready.");
