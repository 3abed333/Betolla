"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Switch, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmDialog } from "@/components/ui";
import { toast } from "@/lib/toast";

export type ShippingZoneRow = {
  id: string;
  cityEn: string;
  cityAr: string;
  fee: string;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  isActive: boolean;
};

type ZoneFormState = {
  cityEn: string;
  cityAr: string;
  fee: string;
  estimatedDaysMin: string;
  estimatedDaysMax: string;
  isActive: boolean;
};

function toFormState(zone: ShippingZoneRow): ZoneFormState {
  return {
    cityEn: zone.cityEn,
    cityAr: zone.cityAr,
    fee: zone.fee,
    estimatedDaysMin: zone.estimatedDaysMin?.toString() ?? "",
    estimatedDaysMax: zone.estimatedDaysMax?.toString() ?? "",
    isActive: zone.isActive,
  };
}

function ZoneRow({ zone }: { zone: ShippingZoneRow }) {
  const router = useRouter();
  const t = useTranslations("admin.settings.shippingZones");
  const initial = toFormState(zone);
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/settings/shipping-zones/${zone.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cityEn: values.cityEn,
        cityAr: values.cityAr,
        fee: Number(values.fee),
        estimatedDaysMin: values.estimatedDaysMin ? Number(values.estimatedDaysMin) : null,
        estimatedDaysMax: values.estimatedDaysMax ? Number(values.estimatedDaysMax) : null,
        isActive: values.isActive,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(t("couldntSaveTitle"), data.error);
      return;
    }
    toast.success(t("updated"));
    router.refresh();
  }

  async function remove() {
    const res = await fetch(`/api/admin/settings/shipping-zones/${zone.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      toast.error(t("couldntRemoveTitle"), data.error);
      return;
    }
    toast.success(t("removed"));
    router.refresh();
  }

  return (
    <TableRow>
      <TableCell>
        <Input value={values.cityEn} onChange={(e) => setValues((v) => ({ ...v, cityEn: e.target.value }))} className="h-9 w-28" />
      </TableCell>
      <TableCell>
        <Input value={values.cityAr} dir="rtl" onChange={(e) => setValues((v) => ({ ...v, cityAr: e.target.value }))} className="h-9 w-28" />
      </TableCell>
      <TableCell>
        <Input type="number" step="0.01" value={values.fee} onChange={(e) => setValues((v) => ({ ...v, fee: e.target.value }))} className="h-9 w-20" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={values.estimatedDaysMin}
            onChange={(e) => setValues((v) => ({ ...v, estimatedDaysMin: e.target.value }))}
            className="h-9 w-14"
            placeholder={t("minPlaceholder")}
          />
          <span className="text-ink-muted">-</span>
          <Input
            type="number"
            value={values.estimatedDaysMax}
            onChange={(e) => setValues((v) => ({ ...v, estimatedDaysMax: e.target.value }))}
            className="h-9 w-14"
            placeholder={t("maxPlaceholder")}
          />
        </div>
      </TableCell>
      <TableCell>
        <Switch checked={values.isActive} onCheckedChange={(c) => setValues((v) => ({ ...v, isActive: c }))} />
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={!dirty || saving} onClick={save}>
            {saving ? t("saving") : t("save")}
          </Button>
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="destructive">
                {t("delete")}
              </Button>
            }
            title={t("removeTitle")}
            description={t("removeDescription")}
            confirmLabel={t("delete")}
            onConfirm={remove}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

function AddZoneRow() {
  const router = useRouter();
  const t = useTranslations("admin.settings.shippingZones");
  const [values, setValues] = useState<ZoneFormState>({
    cityEn: "",
    cityAr: "",
    fee: "",
    estimatedDaysMin: "",
    estimatedDaysMax: "",
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  async function add() {
    if (!values.cityEn.trim() || !values.cityAr.trim() || !values.fee) {
      toast.error(t("namesAndFeeRequired"));
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/admin/settings/shipping-zones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cityEn: values.cityEn,
        cityAr: values.cityAr,
        fee: Number(values.fee),
        estimatedDaysMin: values.estimatedDaysMin ? Number(values.estimatedDaysMin) : null,
        estimatedDaysMax: values.estimatedDaysMax ? Number(values.estimatedDaysMax) : null,
        isActive: values.isActive,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(t("couldntAddTitle"), data.error);
      return;
    }
    setValues({ cityEn: "", cityAr: "", fee: "", estimatedDaysMin: "", estimatedDaysMax: "", isActive: true });
    toast.success(t("added"));
    router.refresh();
  }

  return (
    <TableRow>
      <TableCell>
        <Input placeholder={t("cityEnPlaceholder")} value={values.cityEn} onChange={(e) => setValues((v) => ({ ...v, cityEn: e.target.value }))} className="h-9 w-28" />
      </TableCell>
      <TableCell>
        <Input placeholder="عمان" dir="rtl" value={values.cityAr} onChange={(e) => setValues((v) => ({ ...v, cityAr: e.target.value }))} className="h-9 w-28" />
      </TableCell>
      <TableCell>
        <Input type="number" step="0.01" value={values.fee} onChange={(e) => setValues((v) => ({ ...v, fee: e.target.value }))} className="h-9 w-20" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={values.estimatedDaysMin}
            onChange={(e) => setValues((v) => ({ ...v, estimatedDaysMin: e.target.value }))}
            className="h-9 w-14"
            placeholder={t("minPlaceholder")}
          />
          <span className="text-ink-muted">-</span>
          <Input
            type="number"
            value={values.estimatedDaysMax}
            onChange={(e) => setValues((v) => ({ ...v, estimatedDaysMax: e.target.value }))}
            className="h-9 w-14"
            placeholder={t("maxPlaceholder")}
          />
        </div>
      </TableCell>
      <TableCell>
        <Switch checked={values.isActive} onCheckedChange={(c) => setValues((v) => ({ ...v, isActive: c }))} />
      </TableCell>
      <TableCell>
        <Button size="sm" disabled={submitting} onClick={add}>
          {submitting ? t("adding") : t("add")}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function ShippingZonesManager({ initialZones }: { initialZones: ShippingZoneRow[] }) {
  const t = useTranslations("admin.settings.shippingZones");
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("headers.cityEn")}</TableHead>
          <TableHead>{t("headers.cityAr")}</TableHead>
          <TableHead>{t("headers.feeJD")}</TableHead>
          <TableHead>{t("headers.estDays")}</TableHead>
          <TableHead>{t("headers.active")}</TableHead>
          <TableHead>{t("headers.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {initialZones.map((zone) => (
          <ZoneRow key={zone.id} zone={zone} />
        ))}
        <AddZoneRow />
      </TableBody>
    </Table>
  );
}
