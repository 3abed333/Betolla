import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { reportStatusSchema } from "@/lib/validation/deliverySupport";
import { logActivity } from "@/lib/server/services/activityLog";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const report = await prisma.deliverySupportTicket.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = reportStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updated = await prisma.deliverySupportTicket.update({
    where: { id },
    data: { status: parsed.data.status, staffNote: parsed.data.staffNote },
  });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "DELIVERY_SUPPORT_TICKET_STATUS_UPDATE",
    entityType: "DeliverySupportTicket",
    entityId: id,
    beforeData: { status: report.status, staffNote: report.staffNote },
    afterData: { status: updated.status, staffNote: updated.staffNote },
  });

  return NextResponse.json({ report: updated });
}
