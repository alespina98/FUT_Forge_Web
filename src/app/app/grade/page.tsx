import type { Metadata } from "next";
import { GradeTool } from "@/components/app/grade-tool";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.en.app.grade.title,
};

export default function AppGradePage() {
  return <GradeTool />;
}
