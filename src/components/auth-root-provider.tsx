import { isPublicClerkAuth } from "@/lib/auth/provider";
import { AppAuthContext } from "./app-auth-context";
import { ClerkLocalizedProvider } from "./clerk-localized-provider";
import { ClerkWebsiteAuthProvider, SupabaseWebsiteAuthProvider } from "./website-auth-context";
export function AuthRootProvider({ children }: { children: React.ReactNode }) {
  if (!isPublicClerkAuth()) return <AppAuthContext mode="supabase"><SupabaseWebsiteAuthProvider>{children}</SupabaseWebsiteAuthProvider></AppAuthContext>;
  return <ClerkLocalizedProvider><AppAuthContext mode="clerk"><ClerkWebsiteAuthProvider>{children}</ClerkWebsiteAuthProvider></AppAuthContext></ClerkLocalizedProvider>;
}
