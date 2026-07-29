import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireApiRole } from "@/lib/auth/api-guard";
import { blogPostSchema } from "@/lib/validation/content";
import { sanitizeRichHtml } from "@/lib/server/sanitizeHtml";
import { slugify } from "@/lib/slugify";
import { logActivity } from "@/lib/server/services/activityLog";

async function uniqueSlug(title: string) {
  const base = slugify(title) || `post-${Date.now()}`;
  let slug = base;
  let suffix = 2;
  while (await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}

export async function POST(request: NextRequest) {
  const session = await requireApiRole("ADMIN", "STAFF");
  if (session instanceof NextResponse) return session;
  const parsed = blogPostSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const post = await prisma.blogPost.create({
    data: {
      ...parsed.data,
      slug: await uniqueSlug(parsed.data.titleEn),
      contentHtmlEn: sanitizeRichHtml(parsed.data.contentHtmlEn),
      contentHtmlAr: sanitizeRichHtml(parsed.data.contentHtmlAr),
      publishedAt: parsed.data.isPublished ? new Date() : null,
      authorId: session.userId,
    },
  });
  await logActivity({
    actorId: session.userId,
    actorRole: session.role,
    action: "BLOG_CREATE",
    entityType: "BlogPost",
    entityId: post.id,
    afterData: { titleEn: post.titleEn, isPublished: post.isPublished },
  });
  revalidatePath("/blog");
  return NextResponse.json({ post }, { status: 201 });
}
