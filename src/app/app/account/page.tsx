import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { AccountPanel } from "@/components/app/account-panel";

export const metadata: Metadata = {
  title: copy.en.account.title,
};

export default function AppAccountPage() {
  return <AccountPanel />;
}
