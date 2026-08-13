import { Suspense } from "react";
import type { Metadata } from "next";
import { copy } from "@/lib/copy";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = {
  title: copy.en.register.title,
};

export default function AppRegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
