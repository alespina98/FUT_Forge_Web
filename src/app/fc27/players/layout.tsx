import { AmbientEffects } from "@/components/ambient-effects";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

// Navbar/Footer live here (not in page.tsx) so they stay mounted across
// this route's loading.tsx/error.tsx states too - matching src/app/app/layout.tsx's
// role for the /app/leaks loading.tsx/error.tsx precedent this mirrors.
export default function Fc27PlayersLayout({ children }: LayoutProps<"/fc27/players">) {
  return (
    <main className="min-h-screen overflow-hidden bg-ink text-white">
      <AmbientEffects />
      <Navbar />
      {children}
      <Footer />
    </main>
  );
}
