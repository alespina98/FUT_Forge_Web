import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { AdminUserDetail } from "@/components/app/admin-user-detail";
import { isClerkAuth } from "@/lib/auth/provider";
import { auth } from "@clerk/nextjs/server";
import { getProfileForClerkUser } from "@/lib/auth/user-gateway";
import { notFound,redirect } from "next/navigation";
import { AuthUnavailable } from "@/components/auth-unavailable";

export const metadata: Metadata = {
  title: copy.en.admin.detailTitle,
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function AppAdminUserPage({ params }: Props) {
  const { id } = await params;
  if(isClerkAuth()){let userId:string|null;try{userId=(await auth()).userId}catch{return <AuthUnavailable/>}if(!userId)redirect("/login?next=/app/admin");let profile;try{profile=await getProfileForClerkUser(userId)}catch{return <AuthUnavailable/>}if(profile?.role!=="ADMIN")notFound();return <AdminUserDetail userId={id} clerkMode/>}
  return <AdminUserDetail userId={id} />;
}
