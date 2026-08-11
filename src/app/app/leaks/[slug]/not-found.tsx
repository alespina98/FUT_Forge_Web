"use client";
import Link from "next/link"; import { useI18n } from "@/components/i18n-provider"; import { leaksCopy } from "@/lib/leaks/copy";
export default function NotFound() { const { locale } = useI18n(); const t = leaksCopy[locale]; return <div className="mx-auto max-w-xl rounded-[28px] border border-white/10 bg-white/[.025] px-7 py-20 text-center"><h1 className="text-2xl font-semibold">404</h1><p className="mt-3 text-sm text-white/45">{t.notFound}</p><Link href="/app/leaks" className="mt-6 inline-block rounded-xl bg-lime px-5 py-3 text-xs font-bold text-black">{t.back}</Link></div>; }
