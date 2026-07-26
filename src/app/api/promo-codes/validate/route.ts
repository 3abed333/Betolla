import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import { validatePromoCode, PromoCodeError } from "@/lib/server/services/promoCodes";

const validatePromoCodeSchema = z.object({ code: z.string().trim().min(1).max(50), subtotal: z.number().nonnegative() });

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = validatePromoCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { code, subtotal } = parsed.data;

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
