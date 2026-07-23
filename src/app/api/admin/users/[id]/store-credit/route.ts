import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { storeCreditAdjustmentSchema } from "@/lib/validation/storeCreditAdjustment";
import { adjustStoreCredit, StoreCreditError } from "@/lib/server/services/storeCredit";
import { logActivity } from "@/lib/server/services/activityLog";

// Store credit adjustments move real customer-facing money - Admin-only.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const customer = await prisma.user.findUnique({ where: { id } });
  if (!customer || customer.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = storeCreditAdjustmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const updated = await adjustStoreCredit({
      userId: id,
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      createdById: session.userId,
    });

    await logActivity({
      actorId: session.userId,
      actorRole: session.role,
      action: "STORE_CREDIT_ADJUST",
      entityType: "User",
      entityId: id,
      beforeData: { storeCreditBalance: customer.storeCreditBalance.toString() },
      afterData: { storeCreditBalance: updated.storeCreditBalance.toString(), amount: parsed.data.amount, reason: parsed.data.reason },
    });

    return NextResponse.json({ storeCreditBalance: updated.storeCreditBalance });
  } catch (err) {
    if (err instanceof StoreCreditError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
