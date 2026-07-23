import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  const isStaffOrAdmin = session.role === "ADMIN" || session.role === "STAFF";
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      // Staff-only internal notes must never reach a non-staff caller.
      messages: {
        where: isStaffOrAdmin ? undefined : { isInternalNote: false },
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { firstName: true, lastName: true, role: true } } },
      },
    },
  });
  if (!ticket || (ticket.userId !== session.userId && !isStaffOrAdmin)) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  return NextResponse.json({ ticket });
}
