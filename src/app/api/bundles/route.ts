import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { bundleSchema } from "@/lib/validation/bundle";
import { slugify } from "@/lib/slugify";
import { logActivity } from "@/lib/server/services/activityLog";

async function uniqueSlug(nameEn: string) {
  const base = slugify(nameEn);
  let candidate = base;
  let suffix = 2;
  while (await prisma.productBundle.findFirst({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function POST(request: NextRequest) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;

  const body = await request.json().catch(() => null);
  const parsed = bundleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const slug = await uniqueSlug(parsed.data.nameEn);
  const bundle = await prisma.productBundle.create({
    data: {
      slug,
      nameEn: parsed.data.nameEn,
      nameAr: parsed.data.nameAr,
      descriptionEn: parsed.data.descriptionEn,
      descriptionAr: parsed.data.descriptionAr,
      bundlePrice: parsed.data.bundlePrice,
      mainImageUrl: parsed.data.mainImageUrl,
      isActive: parsed.data.isActive,
      items: { create: parsed.data.items },
    },
  });

  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "BUNDLE_CREATE",
    entityType: "ProductBundle",
    entityId: bundle.id,
    afterData: { nameEn: bundle.nameEn, bundlePrice: bundle.bundlePrice.toString() },
  });

  return NextResponse.json({ bundle });
}
