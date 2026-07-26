import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";

const updateAddressSchema = z.object({ isDefaultShipping: z.boolean() });

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
  const { isDefaultShipping } = parsed.data;
  if (isDefaultShipping) {
    await prisma.address.updateMany({ where: { userId: session.userId }, data: { isDefaultShipping: false } });
  }
  const updated = await prisma.address.update({ where: { id }, data: { isDefaultShipping: !!isDefaultShipping } });
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
