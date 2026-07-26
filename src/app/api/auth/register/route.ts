import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/auth/guards";
import { registerSchema } from "@/lib/validation/auth";
import { isRateLimited, recordAttempt } from "@/lib/auth/rate-limit";
import { THEME_COOKIE } from "@/lib/theme/config";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/server/services/notifications";

// Public self-registration always creates a CUSTOMER - Admin/Staff/Delivery accounts can only
// be created by an existing Admin/Staff user from their respective dashboards (see /api/admin
// and /api/staff routes in later phases), never through this endpoint.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { firstName, lastName, email, username, password } = parsed.data;

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rateLimitKey = `register:${ip}`;
  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again in a few minutes." },
      { status: 429 },
    );
  }
  recordAttempt(rateLimitKey);

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    const field = existing.email === email ? "email" : "username";
    return NextResponse.json({ error: `That ${field} is already registered` }, { status: 409 });
  }

  // Carry whatever theme/language the visitor had already chosen as a guest onto their new
  // account, instead of silently resetting to defaults the moment they register.
  const cookieStore = await cookies();
  const guestTheme = cookieStore.get(THEME_COOKIE)?.value;
  const guestLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      username,
      passwordHash,
      role: "CUSTOMER",
      themePreference: guestTheme === "dark" ? "DARK" : guestTheme === "light" ? "LIGHT" : "SYSTEM",
      locale: isLocale(guestLocale) ? guestLocale.toUpperCase() === "AR" ? "AR" : "EN" : "EN",
    },
  });

  await prisma.notificationPreference.createMany({
    data: DEFAULT_NOTIFICATION_PREFERENCES.map((p) => ({ ...p, userId: user.id })),
  });

  await createSession({
    userId: user.id,
    role: user.role,
    userAgent: request.headers.get("user-agent"),
    ip: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ redirectTo: ROLE_HOME[user.role] });
}
