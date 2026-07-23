import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const isStaffOrAdmin = session.role === "ADMIN" || session.role === "STAFF";
  const report = await prisma.deliverySupportTicket.findUnique({
    where: { id },
    include: {
      deliveryAssignment: {
        select: {
          order: { select: { id: true, orderNumber: true, user: { select: { firstName: true, lastName: true } } } },
        },
      },
      assignedTo: { select: { firstName: true, lastName: true } },
    },
  });
  if (!report || (report.driverId !== session.userId && !isStaffOrAdmin)) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json({ report });
}
