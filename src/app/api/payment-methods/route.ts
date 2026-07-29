import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { createPaymentMethodSchema } from "@/lib/validation/payment-method";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const paymentMethods = await prisma.paymentMethod.findMany({
    where: { userId: session.userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ paymentMethods });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createPaymentMethodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  if (parsed.data.isDefault) {
    await prisma.paymentMethod.updateMany({ where: { userId: session.userId }, data: { isDefault: false } });
  }

  const paymentMethod = await prisma.paymentMethod.create({
    data: {
      userId: session.userId,
      type: parsed.data.type,
      label: "Cash on Delivery",
      maskedDisplay: null,
      isDefault: parsed.data.isDefault ?? false,
    },
  });
  return NextResponse.json({ paymentMethod });
}
