import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { logActivity } from "@/lib/server/services/activityLog";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("STAFF");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const driver = await prisma.user.findUnique({ where: { id } });
  if (!driver || driver.role !== "DELIVERY") {
    return NextResponse.json({ error: "Delivery account not found" }, { status: 404 });
  }

  const { isActive, firstName, lastName, phone } = await request.json().catch(() => ({}));
  const before = { isActive: driver.isActive, firstName: driver.firstName, lastName: driver.lastName };
  const updated = await prisma.user.update({
    where: { id },
    data: {
      isActive: typeof isActive === "boolean" ? isActive : undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      phone: phone || undefined,
    },
    select: { id: true, email: true, username: true, firstName: true, lastName: true, phone: true, isActive: true, createdAt: true },
  });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "DELIVERY_ACCOUNT_UPDATE",
    entityType: "User",
    entityId: id,
    beforeData: before,
    afterData: { isActive: updated.isActive, firstName: updated.firstName, lastName: updated.lastName },
  });

  return NextResponse.json({ driver: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("STAFF");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const driver = await prisma.user.findUnique({ where: { id } });
  if (!driver || driver.role !== "DELIVERY") {
    return NextResponse.json({ error: "Delivery account not found" }, { status: 404 });
  }

  // Soft delete, same reasoning as Staff: ActivityLog/DeliveryAssignment reference this user.
  await prisma.user.update({ where: { id }, data: { isActive: false } });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "DELIVERY_ACCOUNT_DELETE",
    entityType: "User",
    entityId: id,
    beforeData: { email: driver.email },
  });

  return NextResponse.json({ ok: true });
}
