import type { Metadata } from "next";
import { isClerkAuth } from "@/lib/auth/provider";
import { auth } from "@clerk/nextjs/server";
import { getProfileForClerkUser } from "@/lib/auth/user-gateway";
import { notFound, redirect } from "next/navigation";
import { AuthUnavailable } from "@/components/auth-unavailable";
import { AdminAnalyticsDashboard } from "@/components/app/admin-analytics-dashboard";

export const metadata: Metadata = {
  title: "Panoramica — Admin",
  robots: { index: false, follow: false },
};

export default async function AppAdminAnalyticsPage() {
  if (!isClerkAuth()) notFound();
  let userId: string | null;
  try {
    userId = (await auth()).userId;
  } catch {
    return <AuthUnavailable />;
  }
  if (!userId) redirect("/login?next=/app/admin/analytics");
  let profile;
  try {
    profile = await getProfileForClerkUser(userId);
  } catch {
    return <AuthUnavailable />;
  }
  if (profile?.role !== "ADMIN") notFound();
  return <AdminAnalyticsDashboard />;
}
