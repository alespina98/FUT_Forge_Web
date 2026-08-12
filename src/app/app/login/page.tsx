import { Suspense } from "react";
import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: copy.en.auth.title,
};

export default function AppLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
