import type { Metadata } from "next";
import { AmbientEffects } from "@/components/ambient-effects";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { FeatureDetail } from "@/components/feature-detail";
import { copy, siteCopy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.en.evoLabPage.metaTitle,
  description: copy.en.evoLabPage.metaDescription,
  alternates: { canonical: "/features/evo-lab" },
  openGraph: { type: "website", url: "/features/evo-lab", title: copy.en.evoLabPage.metaTitle, description: copy.en.evoLabPage.metaDescription, siteName: siteCopy.applicationName, locale: "en_US", alternateLocale: ["it_IT"] },
  twitter: { card: "summary", title: copy.en.evoLabPage.metaTitle, description: copy.en.evoLabPage.metaDescription },
};

export default function EvoLabPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-ink text-white">
      <AmbientEffects />
      <Navbar />
      <FeatureDetail
        page="evoLabPage"
        screenshot={{ src: "/screenshots/evolutions.png", width: 1456, height: 792, alt: "FUT Forge EVO Lab" }}
        cta={{ href: "/app/evo" }}
      />
      <Footer />
    </main>
  );
}
