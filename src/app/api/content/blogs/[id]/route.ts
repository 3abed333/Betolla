import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { blogPostSchema } from "@/lib/validation/content";
import { sanitizeRichHtml } from "@/lib/server/sanitizeHtml";
import { logActivity } from "@/lib/server/services/activityLog";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const parsed = blogPostSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const before = await prisma.blogPost.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Blog post not found" }, { status: 404 });

  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      ...parsed.data,
      contentHtmlEn: sanitizeRichHtml(parsed.data.contentHtmlEn),
      contentHtmlAr: sanitizeRichHtml(parsed.data.contentHtmlAr),
      publishedAt: parsed.data.isPublished ? before.publishedAt ?? new Date() : null,
    },
  });
  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "BLOG_UPDATE",
    entityType: "BlogPost",
    entityId: id,
    beforeData: { titleEn: before.titleEn, isPublished: before.isPublished },
    afterData: { titleEn: post.titleEn, isPublished: post.isPublished },
  });
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  return NextResponse.json({ post });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;
  const { id } = await params;
  const before = await prisma.blogPost.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
  await prisma.blogPost.delete({ where: { id } });
  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "BLOG_DELETE",
    entityType: "BlogPost",
    entityId: id,
    beforeData: { titleEn: before.titleEn, slug: before.slug },
  });
  revalidatePath("/blog");
  return NextResponse.json({ ok: true });
}
