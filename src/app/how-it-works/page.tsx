import type { Metadata } from "next";
import { AmbientEffects } from "@/components/ambient-effects";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { HowItWorksContent } from "@/components/how-it-works-content";
import { copy, siteCopy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.en.howItWorksPage.metaTitle,
  description: copy.en.howItWorksPage.metaDescription,
  alternates: { canonical: "/how-it-works" },
  openGraph: { type: "website", url: "/how-it-works", title: copy.en.howItWorksPage.metaTitle, description: copy.en.howItWorksPage.metaDescription, siteName: siteCopy.applicationName, locale: "en_US", alternateLocale: ["it_IT"] },
  twitter: { card: "summary", title: copy.en.howItWorksPage.metaTitle, description: copy.en.howItWorksPage.metaDescription },
};

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-ink text-white">
      <AmbientEffects />
      <Navbar />
      <HowItWorksContent />
      <Footer />
    </main>
  );
}
