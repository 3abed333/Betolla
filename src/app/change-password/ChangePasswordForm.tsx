"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { changePasswordSchema } from "@/lib/validation/auth";
import { Button, Input, Card, CardContent } from "@/components/ui";
import type { z } from "zod";

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const router = useRouter();
  const t = useTranslations("changePassword");
  const tErrors = useTranslations();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordValues) {
    setServerError(null);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) {
      setServerError(data.error ?? tErrors("errors.genericTryAgain"));
      return;
    }
    router.push(data.redirectTo);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t("subtext")}</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input
            label={t("currentPassword")}
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message && tErrors(errors.currentPassword.message)}
            {...register("currentPassword")}
          />
          <Input
            label={t("newPassword")}
            type="password"
            autoComplete="new-password"
            hint={t("passwordHint")}
            error={errors.newPassword?.message && tErrors(errors.newPassword.message)}
            {...register("newPassword")}
          />
          <Input
            label={t("confirmNewPassword")}
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message && tErrors(errors.confirmPassword.message)}
            {...register("confirmPassword")}
          />
          {serverError && <p className="text-sm text-red-600">{serverError}</p>}
          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? t("saving") : t("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
