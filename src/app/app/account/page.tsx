import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { AccountPanel } from "@/components/app/account-panel";
import { ClerkAccountPanel } from "@/components/clerk-account-panel";
import { isClerkAuth } from "@/lib/auth/provider";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AuthUnavailable } from "@/components/auth-unavailable";

export const metadata: Metadata = {
  title: copy.en.account.title,
};

export default async function AppAccountPage() {
  if(isClerkAuth()){let userId:string|null;try{userId=(await auth()).userId}catch{return <AuthUnavailable/>}if(!userId)redirect("/login?next=/app/account");return <ClerkAccountPanel/>}
  return <AccountPanel />;
}
