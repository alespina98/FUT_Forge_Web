import type { Metadata } from "next";
import { EvoTool } from "@/components/app/evo-tool";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.en.app.evo.title,
};

export default function AppEvoPage() {
  return <EvoTool />;
}
