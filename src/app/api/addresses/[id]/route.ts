import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { updateAddressSchema } from "@/lib/validation/address";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const address = await prisma.address.findUnique({ where: { id } });
  if (!address || address.userId !== session.userId) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateAddressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { isDefaultShipping, city } = parsed.data;
  if (city) {
    const zone = await prisma.shippingZone.findFirst({
      where: { cityEn: city, isActive: true },
      select: { id: true },
    });
    if (!zone) {
      return NextResponse.json({ error: "That shipping city is not currently supported" }, { status: 400 });
    }
  }
  const updated = await prisma.$transaction(async (tx) => {
    if (isDefaultShipping) {
      await tx.address.updateMany({
        where: { userId: session.userId },
        data: { isDefaultShipping: false },
      });
    }
    return tx.address.update({ where: { id }, data: parsed.data });
  });
  return NextResponse.json({ address: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const address = await prisma.address.findUnique({ where: { id } });
  if (!address || address.userId !== session.userId) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  await prisma.address.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
