import { AmbientEffects } from "@/components/ambient-effects";
import { BrowserBookmarkletSection } from "@/components/browser-bookmarklet-section";
import { DownloadSection } from "@/components/download-section";
import { Features } from "@/components/features";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";
import { BootSequenceSection } from "@/components/product-preview";
import { Roadmap } from "@/components/roadmap";
import { getLatestRelease } from "@/lib/release";

export default async function Home() {
  const release = await getLatestRelease();

  return (
    <main className="min-h-screen overflow-hidden bg-ink text-white">
      <AmbientEffects />
      <Navbar />
      <Hero />
      <BootSequenceSection />
      <Features />
      <DownloadSection release={release} />
      <BrowserBookmarkletSection />
      <Roadmap />
      <Footer />
    </main>
  );
}
