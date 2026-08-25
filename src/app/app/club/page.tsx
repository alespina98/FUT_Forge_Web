import type { Metadata } from "next";
import { ClubTool } from "@/components/app/club-tool";
import { copy } from "@/lib/copy";
import { isClerkAuth } from "@/lib/auth/provider";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthUnavailable } from "@/components/auth-unavailable";

export const metadata: Metadata = {
  title: copy.en.app.club.title,
};

export default async function AppClubPage() {
  if(isClerkAuth()){let userId:string|null;try{userId=(await auth()).userId}catch{return <AuthUnavailable/>}if(!userId)redirect("/login?next=/app/club")}
  return <ClubTool />;
}
