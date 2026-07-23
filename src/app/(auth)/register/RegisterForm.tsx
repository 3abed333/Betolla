"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { registerSchema } from "@/lib/validation/auth";
import { Button, Input, Card, CardContent } from "@/components/ui";
import type { z } from "zod";

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const tErrors = useTranslations();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterValues) {
    setServerError(null);
    const res = await fetch("/api/auth/register", {
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
          <p className="mt-1 text-sm text-ink-muted">{t("join")}</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t("firstName")}
              autoComplete="given-name"
              error={errors.firstName?.message && tErrors(errors.firstName.message)}
              {...register("firstName")}
            />
            <Input
              label={t("lastName")}
              autoComplete="family-name"
              error={errors.lastName?.message && tErrors(errors.lastName.message)}
              {...register("lastName")}
            />
          </div>
          <Input
            label={t("email")}
            type="email"
            autoComplete="email"
            error={errors.email?.message && tErrors(errors.email.message)}
            {...register("email")}
          />
          <Input
            label={t("username")}
            autoComplete="username"
            error={errors.username?.message && tErrors(errors.username.message)}
            {...register("username")}
          />
          <Input
            label={t("password")}
            type="password"
            autoComplete="new-password"
            hint={t("passwordHint")}
            error={errors.password?.message && tErrors(errors.password.message)}
            {...register("password")}
          />
          {serverError && <p className="text-sm text-red-600">{serverError}</p>}
          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? t("creatingAccount") : t("createAccount")}
          </Button>
        </form>
        <p className="text-center text-sm text-ink-muted">
          {t("alreadyHaveAccount")}{" "}
          <Link href="/login" className="font-medium text-ink underline">
            {t("signIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
