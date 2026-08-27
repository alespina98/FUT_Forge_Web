import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getAuthProvider,
  getPublicAuthProvider,
  validateProductionAuthProviderConfiguration,
} from "../lib/auth/provider.ts";
import { getClerkErrorMessage } from "../lib/auth/clerk-error-messages.ts";

const component = readFileSync(new URL("./controlled-clerk-login.tsx", import.meta.url), "utf8");
const routingRoute = readFileSync(new URL("../app/api/auth/clerk/login-routing/route.ts", import.meta.url), "utf8");
const completionRoute = readFileSync(new URL("../app/api/auth/clerk/complete-password-migration/route.ts", import.meta.url), "utf8");
const recovery = readFileSync(new URL("./clerk-password-recovery.tsx", import.meta.url), "utf8");
const importer = readFileSync(new URL("../../scripts/auth/import-legacy-profiles-to-turso.ts", import.meta.url), "utf8");
const provider = readFileSync(new URL("../lib/auth/provider.ts", import.meta.url), "utf8");
const loginPage = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
const registerPage = readFileSync(new URL("../app/register/page.tsx", import.meta.url), "utf8");
const authRoot = readFileSync(new URL("./auth-root-provider.tsx", import.meta.url), "utf8");
const supabaseLogin = readFileSync(new URL("./login-form.tsx", import.meta.url), "utf8");
const websiteAuth = readFileSync(new URL("./website-auth-context.tsx", import.meta.url), "utf8");
const bookmarkletSection = readFileSync(new URL("./browser-bookmarklet-section.tsx", import.meta.url), "utf8");
const navbar = readFileSync(new URL("./navbar.tsx", import.meta.url), "utf8");

test("public auth UI uses the explicit provider while server authority remains AUTH_PROVIDER", () => {
  assert.match(provider, /process\.env\.AUTH_PROVIDER/);
  assert.match(provider, /process\.env\.NEXT_PUBLIC_AUTH_PROVIDER/);
  assert.match(provider, /validateProductionAuthProviderConfiguration/);
  for (const file of [loginPage, registerPage, authRoot]) assert.match(file, /isPublicClerkAuth\(\)/);
  assert.match(loginPage, /<ControlledClerkLogin/);
  assert.match(registerPage, /<ControlledClerkSignup/);
  assert.match(loginPage, /<LoginForm/);
  assert.match(registerPage, /<RegisterForm/);
});

test("production Clerk builds require matching explicit providers and a publishable key", () => {
  const valid = {
    NODE_ENV: "production",
    AUTH_PROVIDER: "clerk",
    NEXT_PUBLIC_AUTH_PROVIDER: "clerk",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_test",
  };
  assert.doesNotThrow(() => validateProductionAuthProviderConfiguration(valid));
  assert.throws(
    () => validateProductionAuthProviderConfiguration({ ...valid, NEXT_PUBLIC_AUTH_PROVIDER: undefined }),
    /must both be explicitly set/,
  );
  assert.throws(
    () => validateProductionAuthProviderConfiguration({ ...valid, NEXT_PUBLIC_AUTH_PROVIDER: "supabase" }),
    /must both be explicitly set/,
  );
  assert.throws(
    () => validateProductionAuthProviderConfiguration({ ...valid, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: " " }),
    /publishable_key is required/i,
  );
});

test("production Supabase rollback requires explicit matching providers", () => {
  assert.doesNotThrow(() => validateProductionAuthProviderConfiguration({
    NODE_ENV: "production",
    AUTH_PROVIDER: "supabase",
    NEXT_PUBLIC_AUTH_PROVIDER: "supabase",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: undefined,
  }));
  assert.throws(
    () => validateProductionAuthProviderConfiguration({
      NODE_ENV: "production",
      AUTH_PROVIDER: undefined,
      NEXT_PUBLIC_AUTH_PROVIDER: undefined,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: undefined,
    }),
    /must both be explicitly set/,
  );
});

test("Clerk UI never imports or calls the Supabase password path", () => {
  assert.doesNotMatch(component, /supabase|signInWithPassword/i);
  assert.match(component, /signIn\.password\(/);
  assert.match(supabaseLogin, /supabase\.auth\.signInWithPassword\(/);
});

test("Clerk website session is the shared navbar and bookmarklet download authority", () => {
  assert.match(websiteAuth, /useUser\(\)/);
  assert.match(websiteAuth, /fetch\("\/api\/auth\/profile"/);
  assert.match(websiteAuth, /authenticated: true/);
  assert.match(navbar, /useWebsiteAuth\(\)/);
  assert.match(bookmarkletSection, /useWebsiteAuth\(\)/);
  assert.doesNotMatch(bookmarkletSection, /useAuthUser|supabase|localStorage|sessionStorage/);
});

test("authenticated Clerk users are redirected before the login form renders", () => {
  assert.match(loginPage, /\(await auth\(\)\)\.userId/);
  assert.match(loginPage, /redirect\(redirectUrl\)/);
  assert.ok(loginPage.indexOf("redirect(redirectUrl)") < loginPage.indexOf("<ControlledClerkLogin"));
});

test("client login guard blocks a second Clerk password attempt", () => {
  assert.match(component, /useUser\(\)/);
  assert.match(component, /if \(isSignedIn\) \{ router\.replace\(redirectUrl\); return; \}/);
  assert.match(component, /if \(!isLoaded \|\| isSignedIn\) return null/);
  assert.ok(component.indexOf("if (isSignedIn)") < component.indexOf("signIn.password"));
});

test("legacy Supabase state cannot override Clerk mode", () => {
  assert.match(authRoot, /ClerkWebsiteAuthProvider/);
  assert.match(authRoot, /SupabaseWebsiteAuthProvider/);
  assert.match(websiteAuth, /!isSignedIn \|\| !user \? signedOut/);
  assert.doesNotMatch(websiteAuth.slice(websiteAuth.indexOf("ClerkWebsiteAuthProvider"), websiteAuth.indexOf("SupabaseWebsiteAuthProvider")), /localStorage|supabase/);
});

test("public Clerk mode and Supabase rollback mode remain independently selectable", () => {
  const server = process.env.AUTH_PROVIDER;
  const browser = process.env.NEXT_PUBLIC_AUTH_PROVIDER;
  try {
    process.env.AUTH_PROVIDER = "clerk";
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "clerk";
    assert.equal(getAuthProvider(), "clerk");
    assert.equal(getPublicAuthProvider(), "clerk");
    process.env.AUTH_PROVIDER = "supabase";
    process.env.NEXT_PUBLIC_AUTH_PROVIDER = "supabase";
    assert.equal(getAuthProvider(), "supabase");
    assert.equal(getPublicAuthProvider(), "supabase");
  } finally {
    if (server === undefined) delete process.env.AUTH_PROVIDER; else process.env.AUTH_PROVIDER = server;
    if (browser === undefined) delete process.env.NEXT_PUBLIC_AUTH_PROVIDER; else process.env.NEXT_PUBLIC_AUTH_PROVIDER = browser;
  }
});

test("login asks the server for routing before attempting Clerk password auth", () => {
  const lookup = component.indexOf("/api/auth/clerk/login-routing");
  const password = component.indexOf("signIn.password");
  assert.ok(lookup !== -1 && password > lookup);
});

test("recovery-required login discards the password and never attempts Clerk auth", () => {
  const branch = component.slice(component.indexOf("if (routing?.recoveryRequired"), component.indexOf("const { error: signInError }"));
  assert.match(branch, /setPassword\(""\)/);
  assert.match(branch, /\/app\/forgot-password\?identifier=/);
  assert.match(branch, /return;/);
  assert.doesNotMatch(branch, /signIn\.password/);
});

test("ACTIVE and unknown users continue through generic Clerk password auth", () => {
  assert.match(component, /const clerkIdentifier = routing\.email \?\? normalizedIdentifier/);
  assert.match(component, /signIn\.password\(\{ identifier: clerkIdentifier, password \}\)/);
  assert.match(component, /signIn\.finalize/);
  assert.doesNotMatch(component, /Supabase|supabase|localStorage|console\./);
});

test("routing state is resolved server-side and fails closed when Turso is unavailable", () => {
  assert.match(routingRoute, /getLoginRouting\(body\.identifier\)/);
  assert.match(routingRoute, /identity_database_unavailable/);
  assert.doesNotMatch(routingRoute, /password/);
});

test("password completion requires an authenticated Clerk user with a password", () => {
  assert.match(completionRoute, /await auth\(\)/);
  assert.match(completionRoute, /user\.passwordEnabled/);
  assert.match(completionRoute, /completePasswordMigration\(userId\)/);
});

test("recovery finalizes Clerk before activating mapping and redirecting", () => {
  const submit = recovery.indexOf("submitPassword");
  const finalize = recovery.indexOf("signIn.finalize");
  const activate = recovery.indexOf("/api/auth/clerk/complete-password-migration");
  const redirect = recovery.indexOf("navigateToDecoratedUrl(finalizedDestination");
  assert.ok(submit < finalize && finalize < activate && activate < redirect);
});

test("fresh-browser client trust is completed with Clerk MFA email code", () => {
  assert.match(component, /signIn\.status === "needs_client_trust"/);
  assert.match(component, /signIn\.mfa\.sendEmailCode\(\)/);
  assert.match(component, /signIn\.mfa\.verifyEmailCode\(\{ code: clientTrustCode\.trim\(\) \}\)/);
});

test("finalize uses decorated absolute-safe navigation and routes pending session tasks", () => {
  assert.match(component, /clerk\.buildTasksUrl\(\)/);
  assert.match(component, /navigateToDecoratedUrl\(decorateUrl\(destination\)/);
  assert.match(component, /finalizeFailed: Boolean\(finalizeError\)/);
});

test("bulk import state depends on a valid bcrypt digest without persisting it", () => {
  assert.match(importer, /hasBcrypt\?"ACTIVE":"PASSWORD_RECOVERY_REQUIRED"/);
  assert.doesNotMatch(importer, /INSERT[^\n]*password_digest/i);
});

test("shared Clerk error mapper covers actionable EN password and auth errors", () => {
  const mapped = (code, context = "recovery") => getClerkErrorMessage({ code }, "en", context);
  assert.match(mapped("form_password_pwned"), /known data breach/);
  assert.equal(mapped("form_password_length_too_short"), "Password must contain at least 8 characters.");
  assert.equal(mapped("form_password_not_strong_enough"), "Please choose a stronger password.");
  assert.match(mapped("form_password_matches_identifier"), /email or username/);
  assert.equal(mapped("form_password_size_in_bytes_exceeded"), "This password is too long.");
  assert.equal(mapped("form_password_incorrect", "login"), "Incorrect password.");
  assert.equal(mapped("form_password_or_identifier_incorrect", "login"), "Incorrect email/username or password.");
});

test("shared Clerk error mapper covers recovery, registration, rate limits, and fallback", () => {
  assert.equal(getClerkErrorMessage({ code: "form_code_incorrect" }, "en", "verification"), "Invalid verification code.");
  assert.match(getClerkErrorMessage({ code: "verification_expired" }, "en", "verification"), /expired/);
  assert.match(getClerkErrorMessage({ code: "too_many_requests" }, "en", "recovery"), /Too many attempts/);
  assert.match(getClerkErrorMessage({ errors: [{ code: "form_identifier_exists__email_address" }] }, "en", "signup"), /already exists/);
  assert.equal(getClerkErrorMessage({ code: "unknown" }, "en", "recovery"), "We couldn't complete that request. Please try again.");
});

test("shared Clerk error mapper localizes actionable errors in Italian", () => {
  assert.match(getClerkErrorMessage({ code: "form_password_pwned" }, "it", "recovery"), /violazione di dati nota/);
  assert.equal(getClerkErrorMessage({ code: "form_password_incorrect" }, "it", "login"), "Password errata.");
  assert.equal(getClerkErrorMessage({ code: "form_code_incorrect" }, "it", "verification"), "Codice di verifica non valido.");
  assert.match(getClerkErrorMessage({ code: "too_many_requests" }, "it", "signup"), /Troppi tentativi/);
});
