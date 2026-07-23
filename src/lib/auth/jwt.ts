import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/generated/prisma/client";

// The JWT's own expiry mostly exists to bound an unrevoked-but-abandoned cookie; real-time
// revocation ("log out this device") is enforced by re-checking the DB Session row on every
// protected request (see requireRole), not by this expiry, so it can safely match the DB
// session's lifetime instead of being kept artificially short.
export const SESSION_LIFETIME_SECONDS = 30 * 24 * 60 * 60; // 30 days

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type SessionTokenPayload = {
  sub: string; // userId
  role: Role;
  sid: string; // Session row id
};

export async function signSessionToken(payload: SessionTokenPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_LIFETIME_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string" || !payload.role) {
      return null;
    }
    return { sub: payload.sub, role: payload.role as Role, sid: payload.sid as string };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "session";
