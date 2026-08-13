import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { AdminUserDetail } from "@/components/app/admin-user-detail";

export const metadata: Metadata = {
  title: copy.en.admin.detailTitle,
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ id: string }> };

export default async function AppAdminUserPage({ params }: Props) {
  const { id } = await params;
  return <AdminUserDetail userId={id} />;
}
