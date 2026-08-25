import { Suspense } from "react";
import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { isClerkAuth } from "@/lib/auth/provider";
import { ClerkPasswordRecovery } from "@/components/clerk-password-recovery";

export const metadata: Metadata = {
  title: copy.en.forgotPassword.title,
};

export default async function AppForgotPasswordPage({ searchParams }: PageProps<"/app/forgot-password">) {
  if (isClerkAuth()) {
    const params = await searchParams;
    const identifier = typeof params.identifier === "string" && params.identifier.length <= 254 ? params.identifier : "";
    return <ClerkPasswordRecovery initialIdentifier={identifier} upgraded={params.upgraded === "1"} />;
  }
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
