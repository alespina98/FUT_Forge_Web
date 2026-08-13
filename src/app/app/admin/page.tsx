import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { AdminUsersList } from "@/components/app/admin-users-list";

export const metadata: Metadata = {
  title: copy.en.admin.title,
  robots: { index: false, follow: false },
};

export default function AppAdminPage() {
  return <AdminUsersList />;
}
