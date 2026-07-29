"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { toast } from "@/lib/toast";

export function BannerActions({ id, ids, index }: { id: string; ids: string[]; index: number }) {
  const t = useTranslations("admin.banners");
  const router = useRouter();
  async function move(delta: number) {
    const next = [...ids];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    const response = await fetch("/api/admin/banners/reorder", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: next }) });
    if (!response.ok) return toast.error(t("saveFailed"));
    router.refresh();
  }
  async function remove() {
    if (!window.confirm(t("deleteConfirm"))) return;
    const response = await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    if (!response.ok) return toast.error(t("deleteFailed"));
    router.refresh();
  }
  return (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => move(-1)} aria-label={t("moveUp")}>↑</Button>
      <Button size="sm" variant="ghost" disabled={index === ids.length - 1} onClick={() => move(1)} aria-label={t("moveDown")}>↓</Button>
      <Button size="sm" variant="outline" asChild><Link href={`/admin/banners/${id}/edit`}>{t("edit")}</Link></Button>
      <Button size="sm" variant="ghost" onClick={remove}>{t("delete")}</Button>
    </div>
  );
}
