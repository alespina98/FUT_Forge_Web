export type AuthProvider = "clerk" | "supabase";
export function getAuthProvider(): AuthProvider {
  const value = process.env.AUTH_PROVIDER?.trim().toLowerCase();
  if (value === "clerk" || value === "supabase") return value;
  return "supabase";
}
export const isClerkAuth = () => getAuthProvider() === "clerk";
