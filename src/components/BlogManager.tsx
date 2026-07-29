"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, Checkbox, Input, Textarea } from "@/components/ui";
import { toast } from "@/lib/toast";

export type ManagedBlogPost = {
  id: string;
  titleEn: string;
  titleAr: string;
  excerptEn: string | null;
  excerptAr: string | null;
  contentHtmlEn: string;
  contentHtmlAr: string;
  coverImageUrl: string | null;
  isPublished: boolean;
};

const EMPTY = {
  titleEn: "",
  titleAr: "",
  excerptEn: "",
  excerptAr: "",
  contentHtmlEn: "",
  contentHtmlAr: "",
  coverImageUrl: "",
  isPublished: false,
};

export function BlogManager({ posts }: { posts: ManagedBlogPost[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  function edit(post: ManagedBlogPost) {
    setEditingId(post.id);
    setValues({
      titleEn: post.titleEn,
      titleAr: post.titleAr,
      excerptEn: post.excerptEn ?? "",
      excerptAr: post.excerptAr ?? "",
      contentHtmlEn: post.contentHtmlEn,
      contentHtmlAr: post.contentHtmlAr,
      coverImageUrl: post.coverImageUrl ?? "",
      isPublished: post.isPublished,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clear() {
    setEditingId(null);
    setValues(EMPTY);
  }

  async function save() {
    setSaving(true);
    const response = await fetch(editingId ? `/api/content/blogs/${editingId}` : "/api/content/blogs", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) return toast.error("Could not save blog post", data.error);
    toast.success(editingId ? "Blog post updated" : "Blog post created");
    clear();
    router.refresh();
  }

  async function remove(post: ManagedBlogPost) {
    if (!window.confirm(`Permanently delete “${post.titleEn}”?`)) return;
    const response = await fetch(`/api/content/blogs/${post.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return toast.error("Could not delete blog post", data.error);
    toast.success("Blog post deleted");
    if (editingId === post.id) clear();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h3 className="font-heading text-xl font-semibold text-ink">{editingId ? "Edit blog post" : "New blog post"}</h3>
            <p className="text-sm text-ink-muted">HTML is allowed in the article body and is sanitized on the server before saving.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="English title" value={values.titleEn} onChange={(e) => setValues({ ...values, titleEn: e.target.value })} />
            <Input label="Arabic title" dir="rtl" value={values.titleAr} onChange={(e) => setValues({ ...values, titleAr: e.target.value })} />
            <Textarea label="English excerpt" value={values.excerptEn} onChange={(e) => setValues({ ...values, excerptEn: e.target.value })} />
            <Textarea label="Arabic excerpt" dir="rtl" value={values.excerptAr} onChange={(e) => setValues({ ...values, excerptAr: e.target.value })} />
            <Textarea className="font-mono" rows={14} label="English article HTML" value={values.contentHtmlEn} onChange={(e) => setValues({ ...values, contentHtmlEn: e.target.value })} />
            <Textarea className="font-mono" rows={14} label="Arabic article HTML" dir="rtl" value={values.contentHtmlAr} onChange={(e) => setValues({ ...values, contentHtmlAr: e.target.value })} />
          </div>
          <Input label="Cover image URL (optional)" value={values.coverImageUrl} onChange={(e) => setValues({ ...values, coverImageUrl: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-ink">
            <Checkbox checked={values.isPublished} onCheckedChange={(checked) => setValues({ ...values, isPublished: checked === true })} />
            Publish this article
          </label>
          <div className="flex gap-3">
            <Button type="button" onClick={save} disabled={saving}>{saving ? "Saving..." : editingId ? "Save changes" : "Create post"}</Button>
            {editingId && <Button type="button" variant="outline" onClick={clear}>Cancel edit</Button>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-ink">{post.titleEn}</p>
                <p className="text-sm text-ink-muted">{post.isPublished ? "Published" : "Draft"} · {post.titleAr}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => edit(post)}>Edit</Button>
                <Button type="button" variant="destructive" size="sm" onClick={() => remove(post)}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {posts.length === 0 && <p className="text-sm text-ink-muted">No blog posts yet.</p>}
      </div>
    </div>
  );
}
