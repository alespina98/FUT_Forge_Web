import { readFile, readdir } from "node:fs/promises";
import { createClient } from "@libsql/client";

const url=process.env.TURSO_DATABASE_URL;
const authToken=process.env.TURSO_AUTH_TOKEN;
if(!url)throw new Error("TURSO_DATABASE_URL is required");
if(!url.startsWith("file:")&&!authToken)throw new Error("TURSO_AUTH_TOKEN is required");
const client=createClient({url,authToken});
const migrationsUrl=new URL("../../turso/migrations/",import.meta.url);
const migrations=(await readdir(migrationsUrl)).filter(name=>/^\d+.*\.sql$/.test(name)).sort();
for(const migration of migrations)await client.executeMultiple(await readFile(new URL(migration,migrationsUrl),"utf8"));
client.close();
console.log("Turso website identity schema is ready.");
