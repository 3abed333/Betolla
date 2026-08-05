import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { notify } from "@/lib/server/services/notifications";
import { logActivity } from "@/lib/server/services/activityLog";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const cart = await prisma.cart.findUnique({ where: { id } });
  if (!cart || cart.status !== "ABANDONED") {
    return NextResponse.json({ error: "Abandoned cart not found" }, { status: 404 });
  }

  await notify({
    userId: cart.userId,
    category: "PROMOTIONS",
    title: "You left something in your cart",
    body: "Come back and finish checking out before it sells out!",
    titleKey: "abandonedCartTitle",
    bodyKey: "abandonedCartBody",
    ctaPath: "/cart",
    ctaLabelKey: "returnToCart",
  });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "ABANDONED_CART_REMINDER_SENT",
    entityType: "Cart",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
