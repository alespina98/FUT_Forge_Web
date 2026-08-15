import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = {
  title: copy.en.resetPassword.title,
};

export default function AppResetPasswordPage() {
  return <ResetPasswordForm />;
}
