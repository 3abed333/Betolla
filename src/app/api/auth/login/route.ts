import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/auth/guards";
import { loginSchema } from "@/lib/validation/auth";
import { isRateLimited, recordAttempt, clearAttempts } from "@/lib/auth/rate-limit";
import { THEME_COOKIE } from "@/lib/theme/config";
import { LOCALE_COOKIE } from "@/i18n/config";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitKey = `${ip}:${email}`;
  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
    recordAttempt(rateLimitKey);
    return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  }

  clearAttempts(rateLimitKey);

  await createSession({
    userId: user.id,
    role: user.role,
    userAgent: request.headers.get("user-agent"),
    ip: request.headers.get("x-forwarded-for"),
  });

  // Carry the account's saved theme/language preference to this device's cookies, so a
  // preference set on one device follows the user when they log in elsewhere.
  const cookieStore = await cookies();
  if (user.themePreference !== "SYSTEM") {
    cookieStore.set(THEME_COOKIE, user.themePreference.toLowerCase(), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  cookieStore.set(LOCALE_COOKIE, user.locale.toLowerCase(), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const redirectTo = user.mustChangePassword ? "/change-password" : ROLE_HOME[user.role];
  return NextResponse.json({ redirectTo });
}
