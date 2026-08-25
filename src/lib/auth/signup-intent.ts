import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeUsername, validUsername } from "./user-gateway";

type SignupIntent = { email: string; username: string; expiresAt: number };

function secret() {
  const value = process.env.CLERK_SECRET_KEY;
  if (!value) throw new Error("CLERK_SECRET_KEY is required");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(`futforge-signup:${payload}`).digest("base64url");
}

export function issueSignupIntent(emailValue: string, usernameValue: string) {
  const email = emailValue.trim().toLowerCase();
  const username = normalizeUsername(usernameValue);
  if (!/^\S+@\S+\.\S+$/.test(email) || !validUsername(username)) throw new Error("Invalid signup intent");
  const payload = Buffer.from(JSON.stringify({ email, username, expiresAt: Date.now() + 10 * 60_000 } satisfies SignupIntent)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifySignupIntent(token: string) {
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) throw new Error("Invalid signup intent");
  const expected = Buffer.from(signature(payload));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new Error("Invalid signup intent");
  const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SignupIntent;
  if (!value.email || !validUsername(value.username) || value.expiresAt < Date.now()) throw new Error("Expired signup intent");
  return value;
}
