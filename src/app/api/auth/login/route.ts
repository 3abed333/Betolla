import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { ROLE_HOME } from "@/lib/auth/guards";
import { loginSchema } from "@/lib/validation/auth";
import { consumeRateLimit, clearRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/auth/client-ip";
import { THEME_COOKIE } from "@/lib/theme/config";
import { LOCALE_COOKIE } from "@/i18n/config";
import { createRequestId } from "@/lib/server/request-id";
import { logError, logInfo, logWarn } from "@/lib/server/logger";
import { isFormSubmission, readJsonOrFormBody } from "@/lib/server/request-body";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  const nativeFormSubmission = isFormSubmission(request);
  const respond = (body: object, status = 200, headers: Record<string, string> = {}) =>
    NextResponse.json(body, { status, headers: { ...headers, "X-Request-Id": requestId } });

  try {
    const body = await readJsonOrFormBody(request);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      logWarn("auth_login_invalid_request", { requestId });
      return respond({ error: parsed.error.issues[0].message }, 400);
    }
    const { email, password } = parsed.data;

    const ip = getClientIp(request);
    const rateLimitKey = `login:${email}`;
    const [accountLimit, networkLimit] = await Promise.all([
      consumeRateLimit(rateLimitKey, { limit: 10 }),
      consumeRateLimit(`login-ip:${ip}`, { limit: 60 }),
    ]);
    if (accountLimit.limited || networkLimit.limited) {
      const retryAfter = Math.max(accountLimit.retryAfterSeconds, networkLimit.retryAfterSeconds);
      logWarn("auth_login_rate_limited", {
        requestId,
        accountLimited: accountLimit.limited,
        networkLimited: networkLimit.limited,
        retryAfterSeconds: retryAfter,
      });
      return respond(
        { error: "Too many login attempts. Please try again in a few minutes." },
        429,
        { "Retry-After": String(retryAfter) },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
      logWarn("auth_login_rejected", { requestId, reason: "invalid_credentials_or_inactive" });
      return respond({ error: "Incorrect email or password" }, 401);
    }

    await clearRateLimit(rateLimitKey);
    await createSession({
      userId: user.id,
      role: user.role,
      userAgent: request.headers.get("user-agent"),
      ip,
    });

    // Carry the account's saved theme/language preference to this device's cookies.
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
    logInfo("auth_login_succeeded", { requestId, userId: user.id, role: user.role });
    if (nativeFormSubmission) {
      return new NextResponse(null, {
        status: 303,
        headers: { Location: redirectTo, "X-Request-Id": requestId },
      });
    }
    return respond({ redirectTo });
  } catch (error) {
    logError("auth_login_failed", error, { requestId });
    return respond({ error: "Unable to sign in right now. Please try again." }, 500);
  }
}
