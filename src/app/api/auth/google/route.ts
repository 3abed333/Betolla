import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildGoogleAuthUrl, signGoogleState } from "@/lib/auth/google";

export async function GET(request: NextRequest) {
  // Only ever a same-origin relative path - anything else (protocol-relative or absolute) is an
  // open-redirect attempt and is ignored in favor of the role's normal home page, same rule the
  // credentials login flow applies to its own `next` param.
  const rawNext = request.nextUrl.searchParams.get("next");
  const safeNext =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("://")
      ? rawNext
      : null;

  const state = await signGoogleState({ next: safeNext });
  return NextResponse.redirect(buildGoogleAuthUrl(state));
}
