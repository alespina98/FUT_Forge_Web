export type AuthProvider = "clerk" | "supabase";
function parseProvider(value: string | undefined): AuthProvider | null {
  const normalized = value?.trim().toLowerCase();
  return normalized === "clerk" || normalized === "supabase" ? normalized : null;
}
export function getAuthProvider(): AuthProvider {
  return parseProvider(process.env.AUTH_PROVIDER) ?? "supabase";
}
export const isClerkAuth = () => getAuthProvider() === "clerk";
export function getPublicAuthProvider(): AuthProvider {
  return parseProvider(process.env.NEXT_PUBLIC_AUTH_PROVIDER) ?? getAuthProvider();
}
export const isPublicClerkAuth = () => getPublicAuthProvider() === "clerk";
