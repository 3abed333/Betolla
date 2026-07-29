import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { createAddressSchema } from "@/lib/validation/address";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const addresses = await prisma.address.findMany({
    where: { userId: session.userId },
    orderBy: [{ isDefaultShipping: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ addresses });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createAddressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const zone = await prisma.shippingZone.findFirst({
    where: { cityEn: parsed.data.city, isActive: true },
    select: { id: true },
  });
  if (!zone) {
    return NextResponse.json({ error: "That shipping city is not currently supported" }, { status: 400 });
  }

  const address = await prisma.$transaction(async (tx) => {
    if (parsed.data.isDefaultShipping) {
      await tx.address.updateMany({
        where: { userId: session.userId },
        data: { isDefaultShipping: false },
      });
    }
    return tx.address.create({
      data: { ...parsed.data, userId: session.userId },
    });
  });
  return NextResponse.json({ address });
}
