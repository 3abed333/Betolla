import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { createManagedAccountSchema } from "@/lib/validation/account-creation";
import { createManagedAccount, AccountCreationError } from "@/lib/server/services/accountCreation";

// Delivery accounts are created only by Staff - never Admin, Delivery, or Customer (matches the
// Admin-creates-Staff / Staff-creates-Delivery chain the role model is built around).
export async function POST(request: NextRequest) {
  const session = await requireApiRole("STAFF");
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = createManagedAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const { user, tempPassword } = await createManagedAccount({
      ...parsed.data,
      role: "DELIVERY",
      createdById: session.userId,
      createdByRole: session.role,
    });
    return NextResponse.json({
      user: { id: user.id, email: user.email, username: user.username },
      tempPassword,
    });
  } catch (err) {
    if (err instanceof AccountCreationError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

export async function GET() {
  const session = await requireApiRole("STAFF");
  if (session instanceof NextResponse) return session;

  const drivers = await prisma.user.findMany({
    where: { role: "DELIVERY" },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, username: true, firstName: true, lastName: true, phone: true, isActive: true, createdAt: true },
  });
  return NextResponse.json({ drivers });
}
