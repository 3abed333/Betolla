import "server-only";
import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slugify";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

// Cached across requests (module-level, like the codebase's other long-lived clients e.g. the
// Prisma client in lib/db) - createRemoteJWKSet itself handles refetching keys as they rotate.
const googleJwks = createRemoteJWKSet(new URL(JWKS_URI));

function getEnv(name: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

function redirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  return `${base.replace(/\/$/, "")}/api/auth/google/callback`;
}

/**
 * The OAuth `state` param doubles as the CSRF token: it's a JWT we sign and Google echoes back
 * verbatim, so verifying the signature on return proves it round-tripped through Google unmodified
 * - no separate state cookie needed. Also carries the post-login redirect target, the same way
 * `next` already works for the credentials login flow.
 */
export async function signGoogleState(params: { next: string | null }) {
  return new SignJWT({ nonce: randomUUID(), next: params.next })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getSecret());
}

export async function verifyGoogleState(token: string): Promise<{ next: string | null } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const next = typeof payload.next === "string" ? payload.next : null;
    return { next };
  } catch {
    return null;
  }
}

export function buildGoogleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: getEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export type GoogleClaims = {
  sub: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
};

/** Exchanges the authorization code for tokens and verifies the returned id_token's signature. */
export async function exchangeGoogleCode(code: string): Promise<GoogleClaims> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getEnv("GOOGLE_CLIENT_ID"),
      client_secret: getEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  const body: { id_token?: string } = await res.json();
  if (!body.id_token) throw new Error("Google token response missing id_token");

  const { payload } = await jwtVerify(body.id_token, googleJwks, {
    issuer: ISSUERS,
    audience: getEnv("GOOGLE_CLIENT_ID"),
  });
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
    throw new Error("Google id_token missing required claims");
  }
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    firstName: typeof payload.given_name === "string" ? payload.given_name : "",
    lastName: typeof payload.family_name === "string" ? payload.family_name : "",
  };
}

/** Same uniqueness-loop shape as the pharmacy username generator in the register route. */
export async function uniqueUsernameFromEmail(email: string) {
  const base = (slugify(email.split("@")[0] ?? "") || "user").slice(0, 24);
  let candidate = base;
  let suffix = 2;
  while (await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })) {
    candidate = `${base.slice(0, 26 - String(suffix).length)}-${suffix++}`;
  }
  return candidate;
}

/** Google-only accounts never authenticate via the password form - this value is never disclosed. */
export function unusablePasswordSeed() {
  return `${randomUUID()}${randomUUID()}`;
}
