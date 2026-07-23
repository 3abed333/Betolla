"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, type AppLocale } from "@/i18n/config";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";

export async function setLocaleCookie(locale: AppLocale) {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const session = await getCurrentSession();
  if (session) {
    await prisma.user.update({
      where: { id: session.userId },
      data: { locale: locale.toUpperCase() as "EN" | "AR" },
    });
  }
}
