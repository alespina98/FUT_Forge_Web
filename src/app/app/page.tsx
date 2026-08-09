import type { Metadata } from "next";
import { AppLandingContent } from "@/components/app/app-landing";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.en.app.landing.title,
};

export default function AppLandingPage() {
  return <AppLandingContent />;
}
