"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { THEME_COOKIE, type ThemeChoice } from "./config";

export async function setThemePreference(theme: ThemeChoice) {
  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const session = await getCurrentSession();
  if (session) {
    await prisma.user.update({
      where: { id: session.userId },
      data: { themePreference: theme.toUpperCase() as "LIGHT" | "DARK" },
    });
  }
}
