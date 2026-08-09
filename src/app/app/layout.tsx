import type { Metadata } from "next";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  // Experimental area — keep it out of search results until we explicitly
  // approve public release of the Web App.
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink text-white">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">{children}</main>
      <Footer />
    </div>
  );
}
