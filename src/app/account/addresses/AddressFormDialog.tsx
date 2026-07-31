"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  Button,
  Input,
  Textarea,
  Checkbox,
} from "@/components/ui";
import { toast } from "@/lib/toast";
import { localizedCity } from "@/lib/cityAr";
import type { AppLocale } from "@/i18n/config";

type EditableAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  city: string;
  deliveryNotes?: string | null;
  isDefaultShipping: boolean;
};

export function AddressFormDialog({
  trigger,
  address,
  shippingZones,
}: {
  trigger: React.ReactNode;
  address?: EditableAddress;
  shippingZones: { city: string }[];
}) {
  const router = useRouter();
  const t = useTranslations("account.addresses");
  const tCommon = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    label: address?.label ?? t("form.defaultLabelValue"),
    recipientName: address?.recipientName ?? "",
    phone: address?.phone ?? "",
    city: address?.city ?? shippingZones[0]?.city ?? "",
    deliveryNotes: address?.deliveryNotes ?? "",
    isDefaultShipping: address?.isDefaultShipping ?? false,
  });

  async function submit() {
    setSubmitting(true);
    const res = await fetch(address ? `/api/addresses/${address.id}` : "/api/addresses", {
      method: address ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(t("form.couldntSaveTitle"), data.error);
      return;
    }
    toast.success(t("form.savedTitle"));
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{address ? t("form.editAddress") : t("form.addNew")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label={t("form.label")} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <Input
              label={t("form.recipientName")}
              value={form.recipientName}
              onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
            />
            <Input
              label={t("form.phone")}
              type="tel"
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <div>
              <label className="text-sm font-medium text-ink">{t("form.city")}</label>
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-4 text-sm text-ink"
              >
                {shippingZones.map(({ city: c }) => (
                  <option key={c} value={c}>
                    {localizedCity(c, locale)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-ink">{t("form.deliveryNotes")}</label>
            <Textarea
              placeholder={t("form.deliveryNotesPlaceholder")}
              value={form.deliveryNotes}
              onChange={(e) => setForm({ ...form, deliveryNotes: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <Checkbox
              checked={form.isDefaultShipping}
              onCheckedChange={(c) => setForm({ ...form, isDefaultShipping: c === true })}
            />
            {t("form.setDefaultCheckbox")}
          </label>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              {tCommon("cancel")}
            </Button>
          </DialogClose>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? t("form.saving") : t("form.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
