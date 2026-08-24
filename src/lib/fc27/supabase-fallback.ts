import "server-only";

const TIMEOUT_MS=5_000;
const announced=new Set<string>();
export async function boundedFc27SupabaseFetch(label:string,input:string|URL,init:RequestInit={}):Promise<Response>{
 if(!announced.has(label)){announced.add(label);console.warn(`[FC27 DATA] using bounded Supabase fallback: ${label}`)}
 try{return await fetch(input,{...init,signal:AbortSignal.timeout(TIMEOUT_MS)})}
 catch(error){const timeout=error instanceof Error&&(error.name==="TimeoutError"||error.name==="AbortError");console.warn(`[FC27 DATA] Supabase fallback failed: ${timeout?"timeout":error instanceof Error?error.name:"network error"}`);throw error}
}
export const FC27_FALLBACK_TIMEOUT_MS=TIMEOUT_MS;
