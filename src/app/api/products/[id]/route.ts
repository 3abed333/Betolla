import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { productSchema } from "@/lib/validation/product";
import { updateProduct, ProductError } from "@/lib/server/services/products";
import { logActivity } from "@/lib/server/services/activityLog";
import { notifyWishlistsOnProductChange } from "@/lib/server/services/notifications";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const before = await prisma.product.findUnique({ where: { id }, include: { knowledge: true } });
  try {
    const product = await updateProduct(id, parsed.data);
    await logActivity({
      actorId: session.userId,
      actorRole: session.role,
      action: "PRODUCT_UPDATE",
      entityType: "Product",
      entityId: id,
      beforeData: before ? { price: before.price.toString(), stock: before.stock, isActive: before.isActive } : undefined,
      afterData: { price: product.price.toString(), stock: product.stock, isActive: product.isActive },
    });
    const knowledgeAction =
      !before?.knowledge && product.knowledge
        ? "PRODUCT_KNOWLEDGE_CREATE"
        : before?.knowledge && !product.knowledge
          ? "PRODUCT_KNOWLEDGE_DELETE"
          : before?.knowledge && product.knowledge
            ? "PRODUCT_KNOWLEDGE_UPDATE"
            : null;
    if (knowledgeAction) {
      await logActivity({
        actorId: session.userId,
        actorRole: session.role,
        action: knowledgeAction,
        entityType: "ProductKnowledge",
        entityId: product.knowledge?.id ?? before?.knowledge?.id,
        beforeData: before?.knowledge ? { productId: id, isActive: before.knowledge.isActive } : undefined,
        afterData: product.knowledge ? { productId: id, isActive: product.knowledge.isActive } : undefined,
      });
    }

    if (before) {
      await notifyWishlistsOnProductChange({
        productId: id,
        productName: product.nameEn,
        before: { price: Number(before.price), stock: before.stock },
        after: { price: Number(product.price), stock: product.stock },
      });
    }

    return NextResponse.json({ product });
  } catch (err) {
    if (err instanceof ProductError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;
  const { id } = await params;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // Soft delete (deactivate) - past orders keep name/price/image snapshots regardless, but
  // hard-deleting could still orphan cart items, reviews, and wishlist entries referencing it.
  await prisma.product.update({ where: { id }, data: { isActive: false } });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "PRODUCT_DELETE",
    entityType: "Product",
    entityId: id,
    beforeData: { sku: product.sku, nameEn: product.nameEn },
  });

  return NextResponse.json({ ok: true });
}
