import type { Metadata } from "next";
import { ClubTool } from "@/components/app/club-tool";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.en.app.club.title,
};

export default function AppClubPage() {
  return <ClubTool />;
}
