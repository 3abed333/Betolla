import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { hashPassword } from "@/lib/auth/password";
import { generateTempPassword } from "@/lib/auth/temp-password";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("STAFF");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const driver = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  });
  if (!driver || driver.role !== "DELIVERY") {
    return NextResponse.json({ error: "Delivery account not found" }, { status: 404 });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true },
    });
    await tx.session.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.activityLog.create({
      data: {
        actorId: session.userId,
        actorRole: session.role,
        action: "DELIVERY_PASSWORD_RESET",
        entityType: "User",
        entityId: id,
        beforeData: { email: driver.email },
      },
    });
  });

  return NextResponse.json({ tempPassword });
}
