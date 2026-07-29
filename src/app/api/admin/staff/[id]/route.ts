import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { logActivity } from "@/lib/server/services/activityLog";
import { updateManagedAccountSchema } from "@/lib/validation/managedAccount";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const staffMember = await prisma.user.findUnique({ where: { id } });
  if (!staffMember || staffMember.role !== "STAFF") {
    return NextResponse.json({ error: "Staff account not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateManagedAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { isActive, firstName, lastName, phone } = parsed.data;
  const before = { isActive: staffMember.isActive, firstName: staffMember.firstName, lastName: staffMember.lastName };
  const updated = await prisma.user.update({
    where: { id },
    data: {
      isActive,
      firstName,
      lastName,
      phone,
    },
    select: { id: true, email: true, username: true, firstName: true, lastName: true, phone: true, isActive: true, createdAt: true },
  });
  if (isActive === false) {
    await prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "STAFF_UPDATE",
    entityType: "User",
    entityId: id,
    beforeData: before,
    afterData: { isActive: updated.isActive, firstName: updated.firstName, lastName: updated.lastName },
  });

  return NextResponse.json({ staff: updated });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const staffMember = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          activityLogs: true,
          supportMessages: true,
          deliveryAssignments: true,
          deliveryReports: true,
          orders: true,
        },
      },
    },
  });
  if (!staffMember || staffMember.role !== "STAFF") {
    return NextResponse.json({ error: "Staff account not found" }, { status: 404 });
  }

  const hasOperationalHistory = Object.values(staffMember._count).some((count) => count > 0);
  if (hasOperationalHistory) {
    return NextResponse.json(
      { error: "This staff account has recorded activity and cannot be permanently deleted. Deactivate it instead." },
      { status: 409 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.activityLog.create({
      data: {
        actorId: session.userId,
        actorRole: session.role,
        action: "STAFF_DELETE",
        entityType: "User",
        entityId: id,
        beforeData: { email: staffMember.email },
      },
    });
    await tx.user.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
