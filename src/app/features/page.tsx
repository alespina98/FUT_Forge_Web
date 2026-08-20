import type { Metadata } from "next";
import { AmbientEffects } from "@/components/ambient-effects";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Features } from "@/components/features";
import { FeaturesOverviewIntro, WebAppTools } from "@/components/features-overview-content";
import { copy, siteCopy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.en.featuresPage.metaTitle,
  description: copy.en.featuresPage.metaDescription,
  alternates: { canonical: "/features" },
  openGraph: { type: "website", url: "/features", title: copy.en.featuresPage.metaTitle, description: copy.en.featuresPage.metaDescription, siteName: siteCopy.applicationName, locale: "en_US", alternateLocale: ["it_IT"] },
  twitter: { card: "summary", title: copy.en.featuresPage.metaTitle, description: copy.en.featuresPage.metaDescription },
};

export default function FeaturesPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-ink text-white">
      <AmbientEffects />
      <Navbar />
      <FeaturesOverviewIntro />
      <Features showIntro={false} />
      <WebAppTools />
      <Footer />
    </main>
  );
}
