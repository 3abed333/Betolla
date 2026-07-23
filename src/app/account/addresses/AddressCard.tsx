"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, Badge, Button, ConfirmDialog } from "@/components/ui";
import { toast } from "@/lib/toast";
import { localizedCity } from "@/lib/cityAr";
import type { AppLocale } from "@/i18n/config";

export function AddressCard({
  address,
}: {
  address: {
    id: string;
    label: string;
    recipientName: string;
    phone: string;
    street: string;
    area: string;
    city: string;
    isDefaultShipping: boolean;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("account.addresses");
  const locale = useLocale() as AppLocale;

  function setDefault() {
    startTransition(async () => {
      await fetch(`/api/addresses/${address.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefaultShipping: true }),
      });
      router.refresh();
    });
  }

  async function remove() {
    const res = await fetch(`/api/addresses/${address.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      toast.error(t("couldntDeleteTitle"), data.error);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-ink">{address.label}</p>
            {address.isDefaultShipping && <Badge variant="success">{t("default")}</Badge>}
          </div>
          <p className="mt-1 text-sm text-ink-muted">{address.recipientName}</p>
          <p className="text-sm text-ink-muted">
            {address.street}, {address.area}, {localizedCity(address.city, locale)}
          </p>
          <p className="text-sm text-ink-muted">
            <span dir="ltr" className="inline-block">
              {address.phone}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {!address.isDefaultShipping && (
            <Button variant="outline" size="sm" onClick={setDefault} disabled={isPending}>
              {t("setAsDefault")}
            </Button>
          )}
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm">
                {t("delete")}
              </Button>
            }
            title={t("deleteConfirmTitle")}
            description={t("deleteConfirmDescription")}
            confirmLabel={t("delete")}
            onConfirm={remove}
          />
        </div>
      </CardContent>
    </Card>
  );
}
