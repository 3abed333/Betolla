import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { recomputeProductReviewAggregate, deleteReview } from "@/lib/server/services/reviews";
import { logActivity } from "@/lib/server/services/activityLog";

const schema = z.object({ isPublished: z.boolean() });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid moderation decision" }, { status: 400 });
  const review = await prisma.review.findUnique({ where: { id }, select: { productId: true } });
  if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
  await prisma.review.update({ where: { id }, data: parsed.data });
  await recomputeProductReviewAggregate(review.productId);
  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: parsed.data.isPublished ? "REVIEW_APPROVE" : "REVIEW_HIDE",
    entityType: "Review",
    entityId: id,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN");
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const deleted = await deleteReview(id, { actorId: session.userId, actorRole: session.role });
  if (!deleted) return NextResponse.json({ error: "Review not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
