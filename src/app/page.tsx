import { AmbientEffects } from "@/components/ambient-effects";
import { DownloadSection } from "@/components/download-section";
import { Features } from "@/components/features";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";
import { BootSequenceSection } from "@/components/product-preview";
import { Roadmap } from "@/components/roadmap";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-ink text-white">
      <AmbientEffects />
      <Navbar />
      <Hero />
      <BootSequenceSection />
      <Features />
      <DownloadSection />
      <Roadmap />
      <Footer />
    </main>
  );
}
