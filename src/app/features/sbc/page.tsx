import type { Metadata } from "next";
import { AmbientEffects } from "@/components/ambient-effects";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { FeatureDetail } from "@/components/feature-detail";
import { copy, siteCopy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.en.sbcPage.metaTitle,
  description: copy.en.sbcPage.metaDescription,
  alternates: { canonical: "/features/sbc" },
  openGraph: { type: "website", url: "/features/sbc", title: copy.en.sbcPage.metaTitle, description: copy.en.sbcPage.metaDescription, siteName: siteCopy.applicationName, locale: "en_US", alternateLocale: ["it_IT"] },
  twitter: { card: "summary", title: copy.en.sbcPage.metaTitle, description: copy.en.sbcPage.metaDescription },
};

export default function SbcPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-ink text-white">
      <AmbientEffects />
      <Navbar />
      <FeatureDetail
        page="sbcPage"
        screenshot={{ src: "/screenshots/sbc-solver.png", width: 1571, height: 782, alt: "FUT Forge SBC Solver" }}
        cta={{ href: "/download" }}
      />
      <Footer />
    </main>
  );
}
