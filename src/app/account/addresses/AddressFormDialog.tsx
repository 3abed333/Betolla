"use client";

import dynamic from "next/dynamic";
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
  Checkbox,
} from "@/components/ui";
import { toast } from "@/lib/toast";
import { localizedCity } from "@/lib/cityAr";
import type { AppLocale } from "@/i18n/config";

const MapPinPicker = dynamic(() => import("@/components/MapPinPicker").then((m) => m.MapPinPicker), {
  ssr: false,
  loading: () => <div className="h-[260px] w-full animate-pulse rounded-xl bg-surface-secondary" />,
});

const JORDAN_CITIES = ["Amman", "Zarqa", "Irbid", "Russeifa", "Aqaba", "As-Salt", "Mafraq"];

export function AddressFormDialog({ trigger }: { trigger: React.ReactNode }) {
  const router = useRouter();
  const t = useTranslations("account.addresses");
  const tCommon = useTranslations("common");
  const locale = useLocale() as AppLocale;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    label: t("form.defaultLabelValue"),
    recipientName: "",
    phone: "",
    city: JORDAN_CITIES[0],
    area: "",
    street: "",
    isDefaultShipping: false,
  });
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, lat: coords.lat ?? undefined, lng: coords.lng ?? undefined }),
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
          <DialogTitle>{t("form.addNew")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <MapPinPicker
            lat={coords.lat}
            lng={coords.lng}
            onChange={(lat, lng) => setCoords({ lat, lng })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("form.label")} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <Input
              label={t("form.recipientName")}
              value={form.recipientName}
              onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
            />
            <Input label={t("form.phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <div>
              <label className="text-sm font-medium text-ink">{t("form.city")}</label>
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-4 text-sm text-ink"
              >
                {JORDAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {localizedCity(c, locale)}
                  </option>
                ))}
              </select>
            </div>
            <Input label={t("form.area")} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            <Input
              label={t("form.streetBuilding")}
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
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
