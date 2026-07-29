import { prisma } from "@/lib/db";
import { BlogManager } from "@/components/BlogManager";

export const metadata = { title: "Blog Management - Betolla Admin" };

export default async function AdminBlogsPage() {
  const posts = await prisma.blogPost.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <div className="flex flex-col gap-5">
      <div><h2 className="font-heading text-2xl font-semibold text-ink">Blog</h2><p className="text-sm text-ink-muted">Create, format, publish, edit, and delete storefront articles.</p></div>
      <BlogManager posts={posts} />
    </div>
  );
}
