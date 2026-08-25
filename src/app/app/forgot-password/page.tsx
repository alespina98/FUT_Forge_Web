import { Suspense } from "react";
import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { isClerkAuth } from "@/lib/auth/provider";
import { ClerkPasswordRecovery } from "@/components/clerk-password-recovery";

export const metadata: Metadata = {
  title: copy.en.forgotPassword.title,
};

export default function AppForgotPasswordPage() {
  if (isClerkAuth()) return <ClerkPasswordRecovery />;
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
