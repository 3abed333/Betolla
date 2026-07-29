import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { signSessionToken, verifySessionToken, SESSION_COOKIE, SESSION_LIFETIME_SECONDS } from "./jwt";
import type { Role } from "@/generated/prisma/client";

export async function createSession(params: {
  userId: string;
  role: Role;
  userAgent?: string | null;
  ip?: string | null;
}) {
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_SECONDS * 1000);
  const session = await prisma.session.create({
    data: {
      userId: params.userId,
      userAgent: params.userAgent ?? null,
      ip: params.ip ?? null,
      expiresAt,
    },
  });

  const token = await signSessionToken({ sub: params.userId, role: params.role, sid: session.id });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_LIFETIME_SECONDS,
  });

  return session;
}

export type CurrentSession = {
  userId: string;
  role: Role;
  sessionId: string;
  mustChangePassword: boolean;
};

/**
 * The authoritative auth check: verifies the JWT AND re-checks the DB Session row on every
 * call, so a revoked/expired session dies immediately regardless of the JWT's own expiry.
 */
export async function getCurrentSession(options?: {
  allowPasswordChangeRequired?: boolean;
}): Promise<CurrentSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { id: payload.sid },
    include: {
      user: {
        select: { role: true, isActive: true, mustChangePassword: true },
      },
    },
  });
  if (!session || session.userId !== payload.sub) return null;
  if (session.revokedAt || session.expiresAt < new Date()) return null;
  // JWT role/active-state claims are only hints. The current database user is authoritative so
  // deactivation and role changes take effect on the very next request.
  if (!session.user.isActive || session.user.role !== payload.role) return null;
  if (session.user.mustChangePassword && !options?.allowPasswordChangeRequired) return null;

  prisma.session
    .update({ where: { id: session.id }, data: { lastActiveAt: new Date() } })
    .catch(() => undefined);

  return {
    userId: payload.sub,
    role: session.user.role,
    sessionId: session.id,
    mustChangePassword: session.user.mustChangePassword,
  };
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const payload = await verifySessionToken(token);
    if (payload) {
      await prisma.session
        .update({ where: { id: payload.sid }, data: { revokedAt: new Date() } })
        .catch(() => undefined);
    }
  }
  cookieStore.delete(SESSION_COOKIE);
}

export function listActiveSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastActiveAt: "desc" },
  });
}

/** Scoped to userId so a user can only ever revoke their own sessions. */
export async function revokeSession(userId: string, sessionId: string) {
  await prisma.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeOtherSessions(userId: string, keepSessionId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null, id: { not: keepSessionId } },
    data: { revokedAt: new Date() },
  });
}
