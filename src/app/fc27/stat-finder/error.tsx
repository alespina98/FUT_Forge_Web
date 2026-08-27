"use client";
import { useEffect } from "react";
import { useI18n } from "@/components/i18n-provider";
import { track } from "@/lib/analytics/client";
export default function StatFinderError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){const {t}=useI18n();const c=t.fc27StatFinderPage;useEffect(()=>{track("feature_error",{feature:"stat_finder",message:error.message.slice(0,200)});},[error]);return <section className="mx-auto max-w-xl px-6 pb-24 pt-48 text-center"><h1 className="text-3xl font-bold">{c.errorTitle}</h1><p className="mt-3 text-white/55">{c.errorBody}</p><button className="button-primary mt-6" onClick={reset}>{c.retry}</button></section>}
