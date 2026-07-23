import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/jwt";
import { ROLE_HOME } from "@/lib/auth/guards";
import type { Role } from "@/generated/prisma/client";

const ROLE_PREFIXES: { prefix: string; role: Role }[] = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/staff", role: "STAFF" },
  { prefix: "/delivery", role: "DELIVERY" },
  { prefix: "/account", role: "CUSTOMER" },
];

// Fast, claims-only check for the common cases (logged out entirely, or obviously the wrong
// role) - the authoritative, DB-backed check (does this session still exist and is it
// unrevoked?) happens in each role-scoped layout via requireRole(). See lib/auth/guards.ts.
export async function proxy(request: NextRequest) {
  const match = ROLE_PREFIXES.find((r) => request.nextUrl.pathname.startsWith(r.prefix));
  if (!match) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySessionToken(token) : null;

  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (payload.role !== match.role) {
    return NextResponse.redirect(new URL(ROLE_HOME[payload.role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*", "/delivery/:path*", "/account/:path*"],
};
