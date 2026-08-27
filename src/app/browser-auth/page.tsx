import Link from "next/link";
import {auth} from "@clerk/nextjs/server";
import {AmbientEffects} from "@/components/ambient-effects";
import {BrowserAuthHandoff} from "@/components/browser-auth-handoff";
import {normalizeUserCode} from "@/lib/auth/device-auth-service";
export default async function BrowserAuthPage({searchParams}:{searchParams:Promise<{code?:string}>}){const code=normalizeUserCode((await searchParams).code),{userId}=await auth();const next=`/browser-auth?code=${encodeURIComponent(code)}`;return <main className="min-h-screen bg-ink px-4 py-24 text-white"><AmbientEffects/><div className="mx-auto max-w-lg"><p className="section-label">FUT Forge Browser</p><h1 className="mt-5 text-4xl font-semibold">Connect to FUT Forge</h1>{!code?<p className="mt-8 text-white/60">This sign-in request is invalid.</p>:!userId?<Link className="button-primary mt-8 inline-flex" href={`/login?next=${encodeURIComponent(next)}`}>Sign in to FUT Forge</Link>:<BrowserAuthHandoff code={code}/>}</div></main>}
