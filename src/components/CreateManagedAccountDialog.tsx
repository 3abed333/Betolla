"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Button,
  Input,
} from "@/components/ui";
import { toast } from "@/lib/toast";

export function CreateManagedAccountDialog({
  apiPath,
  roleLabel,
  trigger,
}: {
  apiPath: string;
  roleLabel: string;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const t = useTranslations("admin.createManagedAccountDialog");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; tempPassword: string } | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", username: "", phone: "" });

  async function submit() {
    setSubmitting(true);
    const res = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      toast.error(t("couldntCreateAccount", { roleLabel: roleLabel.toLowerCase() }), data.error);
      return;
    }
    setCreatedCreds({ email: data.user.email, tempPassword: data.tempPassword });
    router.refresh();
  }

  function close() {
    setOpen(false);
    setCreatedCreds(null);
    setForm({ firstName: "", lastName: "", email: "", username: "", phone: "" });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        {createdCreds ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("accountCreated", { roleLabel })}</DialogTitle>
              <DialogDescription>{t("sharePasswordNote")}</DialogDescription>
            </DialogHeader>
            <div className="rounded-lg bg-surface-secondary p-4 text-sm">
              <p>
                <strong>{t("emailLabel")}</strong> {createdCreds.email}
              </p>
              <p className="mt-1">
                <strong>{t("tempPasswordLabel")}</strong> <code>{createdCreds.tempPassword}</code>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={close}>{t("done")}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("addNewAccount", { roleLabel: roleLabel.toLowerCase() })}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t("firstName")}
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
              <Input
                label={t("lastName")}
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
              <Input
                label={t("email")}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label={t("username")}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
              <Input
                label={t("phoneOptional")}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={submitting}>
                  {tCommon("cancel")}
                </Button>
              </DialogClose>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? t("creating") : t("createAccount")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
