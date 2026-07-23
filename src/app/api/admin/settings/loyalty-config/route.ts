import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { loyaltyConfigSchema } from "@/lib/validation/settings";
import { logActivity } from "@/lib/server/services/activityLog";

// Single-row config table (see schema comment on LoyaltyConfig) - update the existing row if one
// exists, otherwise seed it, so there is never more than one.
export async function PATCH(request: NextRequest) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = loyaltyConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existing = await prisma.loyaltyConfig.findFirst();
  const config = existing
    ? await prisma.loyaltyConfig.update({ where: { id: existing.id }, data: parsed.data })
    : await prisma.loyaltyConfig.create({ data: parsed.data });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "LOYALTY_CONFIG_UPDATE",
    entityType: "LoyaltyConfig",
    entityId: config.id,
    afterData: parsed.data,
  });

  return NextResponse.json({ config });
}
