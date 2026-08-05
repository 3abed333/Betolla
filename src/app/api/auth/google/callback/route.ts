import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/auth/guards";
import {
  exchangeGoogleCode,
  verifyGoogleState,
  uniqueUsernameFromEmail,
  unusablePasswordSeed,
} from "@/lib/auth/google";
import { hashPassword } from "@/lib/auth/password";
import { getClientIp } from "@/lib/auth/client-ip";
import { THEME_COOKIE } from "@/lib/theme/config";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/server/services/notifications";
import { logError, logWarn } from "@/lib/server/logger";

function loginErrorRedirect(request: NextRequest, code: string) {
  return NextResponse.redirect(new URL(`/login?error=${code}`, request.url));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const stateParam = request.nextUrl.searchParams.get("state");
  const googleError = request.nextUrl.searchParams.get("error");

  if (googleError) {
    logWarn("auth_google_denied", { googleError });
    return loginErrorRedirect(request, "google_denied");
  }
  if (!code || !stateParam) return loginErrorRedirect(request, "google");

  const state = await verifyGoogleState(stateParam);
  if (!state) return loginErrorRedirect(request, "google");

  let claims;
  try {
    claims = await exchangeGoogleCode(code);
  } catch (error) {
    logError("auth_google_exchange_failed", error);
    return loginErrorRedirect(request, "google");
  }

  // Google-reported-but-unverified emails can't be trusted to prove ownership of that address,
  // so refuse rather than risk linking/creating an account under someone else's identity.
  if (!claims.emailVerified) {
    return loginErrorRedirect(request, "google_unverified");
  }

  const ip = getClientIp(request);
  const cookieStore = await cookies();

  let user = await prisma.user.findUnique({ where: { googleId: claims.sub } });

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email: claims.email } });
    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { googleId: claims.sub },
      });
    } else {
      const guestTheme = cookieStore.get(THEME_COOKIE)?.value;
      const guestLocale = cookieStore.get(LOCALE_COOKIE)?.value;
      const username = await uniqueUsernameFromEmail(claims.email);
      user = await prisma.user.create({
        data: {
          email: claims.email,
          username,
          passwordHash: await hashPassword(unusablePasswordSeed()),
          googleId: claims.sub,
          role: "CUSTOMER",
          customerType: "INDIVIDUAL",
          firstName: claims.firstName || claims.email.split("@")[0],
          lastName: claims.lastName,
          themePreference:
            guestTheme === "dark"
              ? "DARK"
              : guestTheme === "gold"
                ? "GOLD"
                : guestTheme === "light"
                  ? "LIGHT"
                  : "SYSTEM",
          locale: isLocale(guestLocale) ? (guestLocale.toUpperCase() === "AR" ? "AR" : "EN") : "EN",
          notificationPreferences: { create: DEFAULT_NOTIFICATION_PREFERENCES },
        },
      });
    }
  }

  if (!user.isActive) return loginErrorRedirect(request, "google_inactive");

  await createSession({
    userId: user.id,
    role: user.role,
    userAgent: request.headers.get("user-agent"),
    ip,
  });

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

  const redirectTo = user.mustChangePassword ? "/change-password" : (state.next ?? ROLE_HOME[user.role]);
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
