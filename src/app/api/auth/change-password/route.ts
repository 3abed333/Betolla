import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getCurrentSession } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/auth/guards";
import { changePasswordSchema } from "@/lib/validation/auth";
import { isRateLimited, recordAttempt, clearAttempts } from "@/lib/auth/rate-limit";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Keyed by the authenticated userId (not IP) - this guards against someone who has stolen a
  // session cookie brute-forcing the current-password field, which an IP-only key wouldn't catch
  // if they're attacking from a different network than the legitimate user.
  const rateLimitKey = `change-password:${session.userId}`;
  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    recordAttempt(rateLimitKey);
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }
  clearAttempts(rateLimitKey);

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });

  return NextResponse.json({ redirectTo: ROLE_HOME[user.role] });
}
