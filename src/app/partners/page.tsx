import type { Metadata } from "next";
import { AmbientEffects } from "@/components/ambient-effects";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { PartnersContent } from "@/components/partners-content";
import { copy, siteCopy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.en.partnersPage.metaTitle,
  description: copy.en.partnersPage.metaDescription,
  alternates: { canonical: "/partners" },
  openGraph: { type: "website", url: "/partners", title: copy.en.partnersPage.metaTitle, description: copy.en.partnersPage.metaDescription, siteName: siteCopy.applicationName, locale: "en_US", alternateLocale: ["it_IT"] },
  twitter: { card: "summary", title: copy.en.partnersPage.metaTitle, description: copy.en.partnersPage.metaDescription },
};

export default function PartnersPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-ink text-white">
      <AmbientEffects />
      <Navbar />
      <PartnersContent />
      <Footer />
    </main>
  );
}
