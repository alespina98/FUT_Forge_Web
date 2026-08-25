import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { AdminUsersList } from "@/components/app/admin-users-list";
import { isClerkAuth } from "@/lib/auth/provider";
import { auth } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/auth/user-gateway";
import { notFound,redirect } from "next/navigation";
import { AuthUnavailable } from "@/components/auth-unavailable";

export const metadata: Metadata = {
  title: copy.en.admin.title,
  robots: { index: false, follow: false },
};

export default async function AppAdminPage() {
  if(isClerkAuth()){let userId:string|null;try{userId=(await auth()).userId}catch{return <AuthUnavailable/>}if(!userId)redirect("/login?next=/app/admin");let role;try{role=await getUserRole(userId)}catch{return <AuthUnavailable/>}if(role!=="ADMIN")notFound();return <p className="glass rounded-2xl p-6 text-sm text-white/60">Admin mutations are temporarily disabled while the Clerk adapter is reviewed.</p>}
  return <AdminUsersList />;
}
