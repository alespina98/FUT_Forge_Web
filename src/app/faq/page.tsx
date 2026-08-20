import type { Metadata } from "next";
import { AmbientEffects } from "@/components/ambient-effects";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { FaqContent } from "@/components/faq-content";
import { copy, siteCopy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.en.faqPage.metaTitle,
  description: copy.en.faqPage.metaDescription,
  alternates: { canonical: "/faq" },
  openGraph: { type: "website", url: "/faq", title: copy.en.faqPage.metaTitle, description: copy.en.faqPage.metaDescription, siteName: siteCopy.applicationName, locale: "en_US", alternateLocale: ["it_IT"] },
  twitter: { card: "summary", title: copy.en.faqPage.metaTitle, description: copy.en.faqPage.metaDescription },
};

export default function FaqPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-ink text-white">
      <AmbientEffects />
      <Navbar />
      <FaqContent />
      <Footer />
    </main>
  );
}
