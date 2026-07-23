import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { ticketAssignSchema } from "@/lib/validation/support";
import { logActivity } from "@/lib/server/services/activityLog";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = ticketAssignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  if (parsed.data.assignedToId) {
    const assignee = await prisma.user.findUnique({ where: { id: parsed.data.assignedToId } });
    if (!assignee || (assignee.role !== "ADMIN" && assignee.role !== "STAFF")) {
      return NextResponse.json({ error: "Can only assign to an Admin or Staff account" }, { status: 400 });
    }
  }

  const updated = await prisma.supportTicket.update({
    where: { id },
    data: {
      assignedToId: parsed.data.assignedToId,
      status: parsed.data.assignedToId && ticket.status === "OPEN" ? "ASSIGNED" : ticket.status,
    },
  });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "SUPPORT_TICKET_ASSIGN",
    entityType: "SupportTicket",
    entityId: id,
    beforeData: { assignedToId: ticket.assignedToId },
    afterData: { assignedToId: updated.assignedToId },
  });

  return NextResponse.json({ ticket: updated });
}
