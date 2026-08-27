export type AuthProvider = "clerk" | "supabase";

type AuthProviderEnvironment = Partial<Pick<
  NodeJS.ProcessEnv,
  | "NODE_ENV"
  | "AUTH_PROVIDER"
  | "NEXT_PUBLIC_AUTH_PROVIDER"
  | "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
>>;

function parseProvider(value: string | undefined): AuthProvider | null {
  const normalized = value?.trim().toLowerCase();
  return normalized === "clerk" || normalized === "supabase" ? normalized : null;
}

export function validateProductionAuthProviderConfiguration(
  environment: AuthProviderEnvironment = process.env,
): void {
  if (environment.NODE_ENV !== "production") return;

  const serverProvider = parseProvider(environment.AUTH_PROVIDER);
  const publicProvider = parseProvider(environment.NEXT_PUBLIC_AUTH_PROVIDER);

  if (!serverProvider || !publicProvider || serverProvider !== publicProvider) {
    throw new Error(
      "Production auth build configuration is invalid: AUTH_PROVIDER and " +
        "NEXT_PUBLIC_AUTH_PROVIDER must both be explicitly set to the same " +
        'supported provider ("clerk" or "supabase").',
    );
  }

  if (
    publicProvider === "clerk" &&
    !environment.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
  ) {
    throw new Error(
      "Production Clerk build configuration is invalid: " +
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required.",
    );
  }
}

export function getAuthProvider(): AuthProvider {
  return parseProvider(process.env.AUTH_PROVIDER) ?? "supabase";
}
export const isClerkAuth = () => getAuthProvider() === "clerk";
export function getPublicAuthProvider(): AuthProvider {
  return parseProvider(process.env.NEXT_PUBLIC_AUTH_PROVIDER) ?? getAuthProvider();
}
export const isPublicClerkAuth = () => getPublicAuthProvider() === "clerk";
