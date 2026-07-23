import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { createMessageSchema } from "@/lib/validation/support";
import { notify } from "@/lib/server/services/notifications";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  const isStaffOrAdmin = session.role === "ADMIN" || session.role === "STAFF";
  if (!ticket || (ticket.userId !== session.userId && !isStaffOrAdmin)) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  if (ticket.status === "CLOSED") {
    return NextResponse.json({ error: "This ticket is closed" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Only staff/admin can leave a note the customer never sees.
  const isInternalNote = isStaffOrAdmin && parsed.data.isInternalNote === true;

  const message = await prisma.supportTicketMessage.create({
    data: { ticketId: id, senderId: session.userId, message: parsed.data.message, isInternalNote },
  });

  let nextStatus = ticket.status;
  if (isStaffOrAdmin) {
    if (ticket.status === "OPEN" || ticket.status === "ASSIGNED") nextStatus = "IN_PROGRESS";
  } else if (ticket.status === "RESOLVED") {
    nextStatus = "IN_PROGRESS";
  }
  // Always touch the row (even a same-value status write) so `updatedAt` bumps and the
  // ticket resurfaces at the top of both the customer's and admin's "most recent" lists.
  await prisma.supportTicket.update({ where: { id }, data: { status: nextStatus } });

  // Only the customer has a notification-consuming surface in this build - a staff/admin reply
  // (and never an internal note, which the customer can't see anyway) is the direction worth
  // notifying on.
  if (isStaffOrAdmin && !isInternalNote) {
    await notify({
      userId: ticket.userId,
      category: "SUPPORT",
      title: "New reply to your support ticket",
      body: `${ticket.subject}: you have a new reply from Betolla Support.`,
    });
  }

  return NextResponse.json({ message });
}
