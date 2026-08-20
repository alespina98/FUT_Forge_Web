import { Suspense } from "react";
import type { Metadata } from "next";
import { AmbientEffects } from "@/components/ambient-effects";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { copy, siteCopy } from "@/lib/copy";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = {
  title: copy.en.register.title,
  description: copy.en.register.lead,
  alternates: { canonical: "/register" },
  openGraph: { type: "website", url: "/register", title: copy.en.register.title, description: copy.en.register.lead, siteName: siteCopy.applicationName, locale: "en_US", alternateLocale: ["it_IT"] },
  twitter: { card: "summary", title: copy.en.register.title, description: copy.en.register.lead },
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-ink text-white">
      <AmbientEffects />
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-32 sm:px-6 sm:pt-40">
        <Suspense fallback={null}>
          <RegisterForm />
        </Suspense>
      </div>
      <Footer />
    </main>
  );
}
