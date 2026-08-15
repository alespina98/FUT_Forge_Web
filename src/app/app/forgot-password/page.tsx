import { Suspense } from "react";
import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = {
  title: copy.en.forgotPassword.title,
};

export default function AppForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
