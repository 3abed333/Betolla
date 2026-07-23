import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { validatePromoCode, PromoCodeError } from "@/lib/server/services/promoCodes";

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { code, subtotal } = await request.json().catch(() => ({ code: null, subtotal: 0 }));
  if (!code || typeof subtotal !== "number") {
    return NextResponse.json({ error: "code and subtotal are required" }, { status: 400 });
  }

  try {
    const { discountAmount } = await validatePromoCode(code, session.userId, subtotal);
    return NextResponse.json({ valid: true, discountAmount });
  } catch (err) {
    if (err instanceof PromoCodeError) {
      return NextResponse.json({ valid: false, error: err.message }, { status: 400 });
    }
    throw err;
  }
}
