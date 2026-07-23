"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmDialog } from "@/components/ui";
import { toast } from "@/lib/toast";

export type LoyaltyTierRow = { id: string; nameEn: string; nameAr: string; minPoints: number; sortOrder: number };

function TierRow({ tier }: { tier: LoyaltyTierRow }) {
  const router = useRouter();
  const t = useTranslations("admin.settings.loyaltyTiers");
  const [values, setValues] = useState(tier);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(tier);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/admin/settings/loyalty-tiers/${tier.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameEn: values.nameEn,
        nameAr: values.nameAr,
        minPoints: Number(values.minPoints),
        sortOrder: Number(values.sortOrder),
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
    const res = await fetch(`/api/admin/settings/loyalty-tiers/${tier.id}`, { method: "DELETE" });
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
        <Input value={values.nameEn} onChange={(e) => setValues((v) => ({ ...v, nameEn: e.target.value }))} className="h-9 w-32" />
      </TableCell>
      <TableCell>
        <Input value={values.nameAr} dir="rtl" onChange={(e) => setValues((v) => ({ ...v, nameAr: e.target.value }))} className="h-9 w-32" />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={values.minPoints}
          onChange={(e) => setValues((v) => ({ ...v, minPoints: Number(e.target.value) }))}
          className="h-9 w-24"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          value={values.sortOrder}
          onChange={(e) => setValues((v) => ({ ...v, sortOrder: Number(e.target.value) }))}
          className="h-9 w-20"
        />
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

function AddTierRow() {
  const router = useRouter();
  const t = useTranslations("admin.settings.loyaltyTiers");
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [minPoints, setMinPoints] = useState("0");
  const [sortOrder, setSortOrder] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  async function add() {
    if (!nameEn.trim() || !nameAr.trim()) {
      toast.error(t("namesRequired"));
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/admin/settings/loyalty-tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameEn, nameAr, minPoints: Number(minPoints), sortOrder: Number(sortOrder) }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(t("couldntAddTitle"), data.error);
      return;
    }
    setNameEn("");
    setNameAr("");
    setMinPoints("0");
    setSortOrder("0");
    toast.success(t("added"));
    router.refresh();
  }

  return (
    <TableRow>
      <TableCell>
        <Input placeholder={t("nameEnPlaceholder")} value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="h-9 w-32" />
      </TableCell>
      <TableCell>
        <Input placeholder="ذهبي" dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="h-9 w-32" />
      </TableCell>
      <TableCell>
        <Input type="number" value={minPoints} onChange={(e) => setMinPoints(e.target.value)} className="h-9 w-24" />
      </TableCell>
      <TableCell>
        <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="h-9 w-20" />
      </TableCell>
      <TableCell>
        <Button size="sm" disabled={submitting} onClick={add}>
          {submitting ? t("adding") : t("add")}
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function LoyaltyTiersManager({ initialTiers }: { initialTiers: LoyaltyTierRow[] }) {
  const t = useTranslations("admin.settings.loyaltyTiers");
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("headers.nameEn")}</TableHead>
          <TableHead>{t("headers.nameAr")}</TableHead>
          <TableHead>{t("headers.minPoints")}</TableHead>
          <TableHead>{t("headers.sortOrder")}</TableHead>
          <TableHead>{t("headers.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {initialTiers.map((tier) => (
          <TierRow key={tier.id} tier={tier} />
        ))}
        <AddTierRow />
      </TableBody>
    </Table>
  );
}
