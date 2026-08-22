import type { Metadata } from "next";
import { AmbientEffects } from "@/components/ambient-effects";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Fc27ComingSoon } from "@/components/fc27/coming-soon";
import { copy, siteCopy } from "@/lib/copy";

// Minimal placeholder so the new EA FC 27 nav dropdown never 404s - not a
// real feature yet, so kept out of the sitemap and noindexed until there's
// actual content (see the sitemap.ts comment for the indexing policy this
// follows).
export const metadata: Metadata = {
  title: `${copy.en.fc27ComingSoon.news.title} | FUT Forge`,
  description: copy.en.fc27ComingSoon.news.body,
  alternates: { canonical: "/fc27/news" },
  robots: { index: false, follow: true },
  openGraph: { type: "website", url: "/fc27/news", title: `${copy.en.fc27ComingSoon.news.title} | FUT Forge`, description: copy.en.fc27ComingSoon.news.body, siteName: siteCopy.applicationName, locale: "en_US", alternateLocale: ["it_IT"] },
};

export default function Fc27NewsPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-ink text-white">
      <AmbientEffects />
      <Navbar />
      <Fc27ComingSoon variant="news" />
      <Footer />
    </main>
  );
}
