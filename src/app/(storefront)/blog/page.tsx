import Link from "next/link";
import Image from "next/image";
import { getLocale } from "next-intl/server";
import { Card, CardContent, EmptyState } from "@/components/ui";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";
import { getPublishedBlogPosts } from "@/lib/server/storefrontCache";

export const metadata = { title: "Blog - Betolla Cosmetics" };

export default async function BlogPage() {
  const locale = (await getLocale()) as AppLocale;
  const posts = await getPublishedBlogPosts();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs tracking-widest text-ink-muted uppercase">Betolla</p>
        <h1 className="font-heading text-3xl font-semibold text-ink">{locale === "ar" ? "المدونة" : "Blog"}</h1>
      </div>
      {posts.length === 0 ? (
        <EmptyState title={locale === "ar" ? "لا توجد مقالات منشورة بعد" : "No published articles yet"} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              {post.coverImageUrl && (
                <div className="relative aspect-[16/9]">
                  <Image src={post.coverImageUrl} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
                </div>
              )}
              <CardContent className="flex flex-col gap-3">
                <h2 className="font-heading text-xl font-semibold text-ink">{localizedField(locale, post.titleEn, post.titleAr)}</h2>
                {(post.excerptEn || post.excerptAr) && <p className="text-sm text-ink-muted">{localizedField(locale, post.excerptEn ?? "", post.excerptAr ?? "")}</p>}
                <Link className="text-sm font-medium text-cta underline" href={`/blog/${post.slug}`}>
                  {locale === "ar" ? "اقرأ المقال" : "Read article"}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
