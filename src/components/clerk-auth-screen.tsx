"use client";
import { SignIn, SignUp } from "@clerk/nextjs";
const appearance = { variables: { colorPrimary: "#b8ff38", colorBackground: "transparent" }, elements: { rootBox: "w-full", cardBox: "w-full shadow-none", card: "glass !w-full rounded-2xl !bg-transparent shadow-none", headerTitle: "text-white", headerSubtitle: "text-white/55", formFieldLabel: "text-white/60", formFieldInput: "border-white/10 bg-white/[.03] text-white", formButtonPrimary: "button-primary", footerActionLink: "text-lime" } } as const;
export function ClerkAuthScreen({ mode, redirectUrl }: { mode: "login" | "register"; redirectUrl: string }) {
  return <div className="mx-auto max-w-md">{mode === "login" ? <SignIn routing="hash" fallbackRedirectUrl={redirectUrl} signUpUrl="/register" appearance={appearance} /> : <SignUp routing="hash" fallbackRedirectUrl={redirectUrl} signInUrl="/login" appearance={appearance} />}</div>;
}
