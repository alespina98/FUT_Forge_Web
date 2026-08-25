import { isClerkAuth } from "@/lib/auth/provider";
import { AppAuthContext } from "./app-auth-context";
import { ClerkLocalizedProvider } from "./clerk-localized-provider";
export function AuthRootProvider({ children }: { children: React.ReactNode }) {
  if (!isClerkAuth()) return <AppAuthContext mode="supabase">{children}</AppAuthContext>;
  return <ClerkLocalizedProvider><AppAuthContext mode="clerk">{children}</AppAuthContext></ClerkLocalizedProvider>;
}
