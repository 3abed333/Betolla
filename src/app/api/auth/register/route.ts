import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/auth/guards";
import { registerSchema } from "@/lib/validation/auth";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/auth/client-ip";
import { THEME_COOKIE } from "@/lib/theme/config";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/server/services/notifications";
import { Prisma } from "@/generated/prisma/client";
import { isFormSubmission, readJsonOrFormBody } from "@/lib/server/request-body";
import { slugify } from "@/lib/slugify";

async function uniquePharmacyUsername(email: string, pharmacyName: string) {
  const emailBase = email.split("@")[0] ?? "";
  const base = (slugify(pharmacyName) || slugify(emailBase) || "pharmacy").slice(0, 24);
  let candidate = base;
  let suffix = 2;
  while (await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })) {
    candidate = `${base.slice(0, 26 - String(suffix).length)}-${suffix++}`;
  }
  return candidate;
}

// Public self-registration always creates a CUSTOMER - Admin/Staff/Delivery accounts can only
// be created by an existing Admin/Staff user from their respective dashboards (see /api/admin
// and /api/staff routes in later phases), never through this endpoint.
export async function POST(request: NextRequest) {
  const nativeFormSubmission = isFormSubmission(request);
  const body = await readJsonOrFormBody(request);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { customerType, email, password, pharmacyName, pharmacyLocation } = parsed.data;
  const username = customerType === "PHARMACY"
    ? await uniquePharmacyUsername(email, pharmacyName)
    : parsed.data.username;
  const firstName = customerType === "PHARMACY" ? pharmacyName : parsed.data.firstName;
  const lastName = customerType === "PHARMACY" ? "" : parsed.data.lastName;

  const ip = getClientIp(request);
  const rateLimitKey = `register:${ip}`;
  const rateLimit = await consumeRateLimit(rateLimitKey, { limit: 10, windowMs: 60 * 60 * 1000 });
  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Unable to create an account with those details" },
      { status: 409 },
    );
  }

  // Carry whatever theme/language the visitor had already chosen as a guest onto their new
  // account, instead of silently resetting to defaults the moment they register.
  const cookieStore = await cookies();
  const guestTheme = cookieStore.get(THEME_COOKIE)?.value;
  const guestLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  const passwordHash = await hashPassword(password);
  let user;
  try {
    user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        username,
        passwordHash,
        role: "CUSTOMER",
        customerType,
        pharmacyName: customerType === "PHARMACY" ? pharmacyName : null,
        pharmacyLocation: customerType === "PHARMACY" ? pharmacyLocation : null,
        themePreference:
          guestTheme === "dark"
            ? "DARK"
            : guestTheme === "gold"
              ? "GOLD"
              : guestTheme === "light"
                ? "LIGHT"
                : "SYSTEM",
        locale: isLocale(guestLocale) ? guestLocale.toUpperCase() === "AR" ? "AR" : "EN" : "EN",
        notificationPreferences: {
          create: DEFAULT_NOTIFICATION_PREFERENCES,
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Unable to create an account with those details" },
        { status: 409 },
      );
    }
    throw error;
  }

  await createSession({
    userId: user.id,
    role: user.role,
    userAgent: request.headers.get("user-agent"),
    ip,
  });

  const redirectTo = ROLE_HOME[user.role];
  if (nativeFormSubmission) {
    return new NextResponse(null, { status: 303, headers: { Location: redirectTo } });
  }
  return NextResponse.json({ redirectTo });
}
