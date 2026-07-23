import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { createReportSchema } from "@/lib/validation/deliverySupport";

export async function GET() {
  const session = await requireApiRole("DELIVERY");
  if (session instanceof NextResponse) return session;

  const reports = await prisma.deliverySupportTicket.findMany({
    where: { driverId: session.userId },
    orderBy: { createdAt: "desc" },
    include: { deliveryAssignment: { select: { order: { select: { orderNumber: true } } } } },
  });
  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  const session = await requireApiRole("DELIVERY");
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = createReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  if (parsed.data.deliveryAssignmentId) {
    const assignment = await prisma.deliveryAssignment.findUnique({
      where: { id: parsed.data.deliveryAssignmentId },
    });
    if (!assignment || assignment.driverId !== session.userId) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 400 });
    }
  }

  const report = await prisma.deliverySupportTicket.create({
    data: {
      driverId: session.userId,
      deliveryAssignmentId: parsed.data.deliveryAssignmentId,
      problemType: parsed.data.problemType,
      description: parsed.data.description,
      photoUrl: parsed.data.photoUrl,
      urgency: parsed.data.urgency,
    },
  });
  return NextResponse.json({ report });
}
