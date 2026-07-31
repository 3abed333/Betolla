import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { createTicketSchema } from "@/lib/validation/support";
import { notifyRoles } from "@/lib/server/services/notifications";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ tickets });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  if (parsed.data.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: parsed.data.orderId },
      select: { id: true, userId: true },
    });
    if (!order || order.userId !== session.userId) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: session.userId,
      subject: parsed.data.subject,
      category: parsed.data.category,
      orderId: parsed.data.orderId ?? null,
      messages: { create: [{ senderId: session.userId, message: parsed.data.message }] },
    },
  });

  await notifyRoles(["STAFF", "ADMIN"], {
    category: "SUPPORT",
    title: "New support ticket",
    body: `${ticket.subject} needs a response.`,
    titleKey: "newSupportTicketTitle",
    bodyKey: "newSupportTicketBody",
    templateParams: { subject: ticket.subject },
  });

  return NextResponse.json({ ticket });
}
