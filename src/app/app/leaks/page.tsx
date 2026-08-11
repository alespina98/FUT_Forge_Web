import type { Metadata } from "next";
import { LeaksFeed } from "@/components/app/leaks-feed";
export const metadata: Metadata = { title: "Leaks", description: "Upcoming Ultimate Team content, centralized by FUT Forge." };
export default function LeaksPage() { return <div className="mx-auto max-w-6xl"><LeaksFeed /></div>; }
