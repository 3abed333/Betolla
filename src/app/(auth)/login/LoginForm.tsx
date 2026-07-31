"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { loginSchema } from "@/lib/validation/auth";
import { Button, Input, Card, CardContent } from "@/components/ui";
import type { z } from "zod";

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const t = useTranslations("auth.login");
  const tErrors = useTranslations();
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    const next = searchParams.get("next");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, next }),
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
          <p className="mt-1 text-sm text-ink-muted">{t("welcomeBack", { brand: tCommon("brand") })}</p>
        </div>
        <form
          action="/api/auth/login"
          method="post"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <Input
            label={t("email")}
            type="email"
            autoComplete="email"
            error={errors.email?.message && tErrors(errors.email.message)}
            {...register("email")}
          />
          <Input
            label={t("password")}
            type="password"
            autoComplete="current-password"
            error={errors.password?.message && tErrors(errors.password.message)}
            {...register("password")}
          />
          {serverError && <p className="text-sm text-red-600">{serverError}</p>}
          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? t("signingIn") : t("signIn")}
          </Button>
        </form>
        <p className="text-center text-sm text-ink-muted">
          {t("newToBetolla")}{" "}
          <Link href="/register" className="font-medium text-ink underline">
            {t("createAccount")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
