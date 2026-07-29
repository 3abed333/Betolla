import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/auth/api-guard";
import { productSchema } from "@/lib/validation/product";
import { createProduct, ProductError } from "@/lib/server/services/products";
import { logActivity } from "@/lib/server/services/activityLog";

export async function POST(request: NextRequest) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  try {
    const product = await createProduct(parsed.data);
    await logActivity({
      actorId: session.userId,
      actorRole: session.role,
      action: "PRODUCT_CREATE",
      entityType: "Product",
      entityId: product.id,
      afterData: { sku: product.sku, nameEn: product.nameEn, price: product.price.toString() },
    });
    if (product.knowledge) {
      await logActivity({
        actorId: session.userId,
        actorRole: session.role,
        action: "PRODUCT_KNOWLEDGE_CREATE",
        entityType: "ProductKnowledge",
        entityId: product.knowledge.id,
        afterData: { productId: product.id, isActive: product.knowledge.isActive },
      });
    }
    return NextResponse.json({ product });
  } catch (err) {
    if (err instanceof ProductError) return NextResponse.json({ error: err.message }, { status: 409 });
    throw err;
  }
}
