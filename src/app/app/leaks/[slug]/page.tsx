import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeakDetail } from "@/components/app/leak-detail";
import { getPublishedLeak } from "@/lib/leaks/repository";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const leak = await getPublishedLeak(slug); return leak ? { title: leak.title, description: leak.shortDescription } : { title: "Leak unavailable" }; }
export default async function LeakPage({ params }: Props) { const { slug } = await params; const leak = await getPublishedLeak(slug); if (!leak) notFound(); return <LeakDetail leak={leak}/>; }
