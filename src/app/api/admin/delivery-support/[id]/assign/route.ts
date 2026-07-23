import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { reportAssignSchema } from "@/lib/validation/deliverySupport";
import { logActivity } from "@/lib/server/services/activityLog";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const report = await prisma.deliverySupportTicket.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = reportAssignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  if (parsed.data.assignedToId) {
    const assignee = await prisma.user.findUnique({ where: { id: parsed.data.assignedToId } });
    if (!assignee || (assignee.role !== "ADMIN" && assignee.role !== "STAFF")) {
      return NextResponse.json({ error: "Can only assign to an Admin or Staff account" }, { status: 400 });
    }
  }

  const updated = await prisma.deliverySupportTicket.update({
    where: { id },
    data: {
      assignedToId: parsed.data.assignedToId,
      status: parsed.data.assignedToId && report.status === "OPEN" ? "ASSIGNED" : report.status,
    },
  });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "DELIVERY_SUPPORT_TICKET_ASSIGN",
    entityType: "DeliverySupportTicket",
    entityId: id,
    beforeData: { assignedToId: report.assignedToId },
    afterData: { assignedToId: updated.assignedToId },
  });

  return NextResponse.json({ report: updated });
}
