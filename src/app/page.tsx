import { AmbientEffects } from "@/components/ambient-effects";
import { ExploreSection } from "@/components/explore-section";
import { FinalCta } from "@/components/final-cta";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";
import { TrustStrip } from "@/components/trust-strip";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-ink text-white">
      <AmbientEffects />
      <Navbar />
      <Hero />
      <TrustStrip />
      <ExploreSection />
      <FinalCta />
      <Footer />
    </main>
  );
}
