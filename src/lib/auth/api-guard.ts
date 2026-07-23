import "server-only";
import { NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/client";
import { getCurrentSession, type CurrentSession } from "./session";

/**
 * For Route Handlers shared by more than one role (e.g. Admin + Staff order management).
 * Returns either the verified session, or a ready-to-return 401/403 NextResponse - callers do
 * `const result = await requireApiRole(...); if (result instanceof NextResponse) return result;`
 */
export async function requireApiRole(...allowed: Role[]): Promise<CurrentSession | NextResponse> {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!allowed.includes(session.role)) {
    return NextResponse.json({ error: "You don't have permission to do that" }, { status: 403 });
  }
  return session;
}
