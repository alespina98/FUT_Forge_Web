import type { Metadata } from "next";
import { PriceTool } from "@/components/app/price-tool";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.en.app.price.title,
};

export default function AppPricePage() {
  return <PriceTool />;
}
