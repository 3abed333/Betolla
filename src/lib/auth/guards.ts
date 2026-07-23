import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { getCurrentSession, type CurrentSession } from "./session";

export const ROLE_HOME: Record<Role, string> = {
  CUSTOMER: "/",
  STAFF: "/staff",
  DELIVERY: "/delivery",
  ADMIN: "/admin",
};

/**
 * Call once at the top of a role-scoped layout. Not logged in -> /login. Logged in as the
 * wrong role -> their own dashboard (not a bare 403), since URL-guessing into someone else's
 * area is the expected way this gets hit, not a real authorization edge case to dwell on.
 */
export async function requireRole(...allowed: Role[]): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!allowed.includes(session.role)) redirect(ROLE_HOME[session.role]);
  return session;
}

/**
 * For resources scoped to a single owning user (orders, tickets, addresses, ...). Staff/Admin
 * bypass the ownership check since they legitimately need cross-customer access.
 */
export function assertOwnership(session: CurrentSession, resourceUserId: string) {
  if (session.role === "ADMIN" || session.role === "STAFF") return;
  if (session.userId !== resourceUserId) redirect(ROLE_HOME[session.role]);
}
