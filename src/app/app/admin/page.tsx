import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { AdminUsersList } from "@/components/app/admin-users-list";
import { isClerkAuth } from "@/lib/auth/provider";
import { auth } from "@clerk/nextjs/server";
import { getProfileForClerkUser } from "@/lib/auth/user-gateway";
import { notFound,redirect } from "next/navigation";
import { AuthUnavailable } from "@/components/auth-unavailable";

export const metadata: Metadata = {
  title: copy.en.admin.title,
  robots: { index: false, follow: false },
};

export default async function AppAdminPage() {
  if(isClerkAuth()){let userId:string|null;try{userId=(await auth()).userId}catch{return <AuthUnavailable/>}if(!userId)redirect("/login?next=/app/admin");let profile;try{profile=await getProfileForClerkUser(userId)}catch{return <AuthUnavailable/>}if(profile?.role!=="ADMIN")notFound();return <AdminUsersList clerkMode actorApplicationUserId={profile.id}/>}
  return <AdminUsersList />;
}
