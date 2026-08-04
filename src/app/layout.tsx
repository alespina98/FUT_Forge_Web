import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });
export const metadata: Metadata = { title: "FUT Forge - Build smarter. Play better.", description: "The desktop companion for smarter squad building, player analysis, and market decisions." };
export default function RootLayout({ children }: LayoutProps<"/">) { return <html lang="en" className={`${geist.variable} ${mono.variable}`}><body>{children}</body></html>; }
