import type { Metadata } from "next";
import { AmbientEffects } from "@/components/ambient-effects";
import { DownloadPageContent } from "@/components/download-page";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { copy, siteCopy } from "@/lib/copy";
import { getLatestRelease } from "@/lib/release";

export const metadata: Metadata = {
  title: copy.en.downloadPage.metaTitle,
  description: copy.en.downloadPage.metaDescription,
  alternates: { canonical: "/download" },
  openGraph: { type: "website", url: "/download", title: copy.en.downloadPage.metaTitle, description: copy.en.downloadPage.metaDescription, siteName: siteCopy.applicationName, locale: "en_US", alternateLocale: ["it_IT"] },
  twitter: { card: "summary", title: copy.en.downloadPage.metaTitle, description: copy.en.downloadPage.metaDescription },
};

export default async function DownloadPage() {
  const release = await getLatestRelease();
  return <main className="min-h-screen overflow-hidden bg-ink text-white"><AmbientEffects /><Navbar /><DownloadPageContent release={release} /><Footer /></main>;
}
