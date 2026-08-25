import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { isClerkAuth } from "@/lib/auth/provider";
import { ClerkPasswordRecovery } from "@/components/clerk-password-recovery";

export const metadata: Metadata = {
  title: copy.en.resetPassword.title,
};

export default function AppResetPasswordPage() {
  if (isClerkAuth()) return <ClerkPasswordRecovery />;
  return <ResetPasswordForm />;
}
