import { AmbientEffects } from "@/components/ambient-effects";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

export default function Fc27Layout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen overflow-hidden bg-ink text-white"><AmbientEffects /><Navbar />{children}<Footer /></main>;
}
