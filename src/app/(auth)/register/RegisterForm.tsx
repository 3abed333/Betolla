"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { registerSchema } from "@/lib/validation/auth";
import { Button, Input, Card, CardContent, Checkbox } from "@/components/ui";
import { GoogleIcon } from "@/components/GoogleIcon";
import type { z } from "zod";

type RegisterValues = z.input<typeof registerSchema>;
const DRAFT_KEY = "betolla-registration-draft";
let inMemoryDraft: RegisterValues | null = null;
function rememberInMemoryDraft(values: RegisterValues | null) {
  inMemoryDraft = values;
}

export function RegisterForm() {
  const t = useTranslations("auth.register");
  const tErrors = useTranslations();
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      customerType: "INDIVIDUAL",
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      pharmacyName: "",
      pharmacyLocation: "",
      password: "",
      privacyAccepted: false,
    },
  });
  const customerType = useWatch({ control, name: "customerType" });
  const privacyAccepted = useWatch({ control, name: "privacyAccepted" });

  useEffect(() => {
    if (inMemoryDraft) {
      reset(inMemoryDraft);
      return;
    }
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      reset({ ...JSON.parse(raw), password: "", privacyAccepted: false });
    } catch {
      sessionStorage.removeItem(DRAFT_KEY);
    }
  }, [reset]);

  function preserveSafeDraft() {
    const values = getValues();
    // Keep the complete draft only in memory while navigating to the policy and back.
    // The password is deliberately never written to sessionStorage/localStorage.
    rememberInMemoryDraft(values);
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
      customerType: values.customerType,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      username: values.username,
      pharmacyName: values.pharmacyName,
      pharmacyLocation: values.pharmacyLocation,
    }));
  }

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
    sessionStorage.removeItem(DRAFT_KEY);
    rememberInMemoryDraft(null);
    router.push(data.redirectTo);
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t("join", { brand: tCommon("brand") })}</p>
        </div>
        <form
          action="/api/auth/register"
          method="post"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <input type="hidden" {...register("customerType")} />
          <div className="grid grid-cols-2 rounded-xl bg-surface-secondary p-1">
            <button
              type="button"
              onClick={() => setValue("customerType", "INDIVIDUAL")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${customerType === "INDIVIDUAL" ? "bg-surface text-ink shadow-sm" : "text-ink-muted"}`}
            >
              {t("individual")}
            </button>
            <button
              type="button"
              onClick={() => setValue("customerType", "PHARMACY")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${customerType === "PHARMACY" ? "bg-surface text-ink shadow-sm" : "text-ink-muted"}`}
            >
              {t("pharmacy")}
            </button>
          </div>

          {customerType === "INDIVIDUAL" ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t("firstName")}
                  autoComplete="given-name"
                  error={errors.firstName?.message && tErrors(String(errors.firstName.message))}
                  {...register("firstName")}
                />
                <Input
                  label={t("lastName")}
                  autoComplete="family-name"
                  error={errors.lastName?.message && tErrors(String(errors.lastName.message))}
                  {...register("lastName")}
                />
              </div>
              <Input
                label={t("username")}
                autoComplete="username"
                error={errors.username?.message && tErrors(String(errors.username.message))}
                {...register("username")}
              />
            </>
          ) : (
            <>
              <Input
                label={t("pharmacyName")}
                autoComplete="organization"
                error={errors.pharmacyName?.message && tErrors(String(errors.pharmacyName.message))}
                {...register("pharmacyName")}
              />
              <Input
                label={t("pharmacyLocation")}
                autoComplete="street-address"
                error={errors.pharmacyLocation?.message && tErrors(String(errors.pharmacyLocation.message))}
                {...register("pharmacyLocation")}
              />
            </>
          )}

          <Input
            label={t("email")}
            type="email"
            autoComplete="email"
            error={errors.email?.message && tErrors(String(errors.email.message))}
            {...register("email")}
          />
          <Input
            label={t("password")}
            type="password"
            autoComplete="new-password"
            hint={t("passwordHint")}
            error={errors.password?.message && tErrors(String(errors.password.message))}
            {...register("password")}
          />
          <div className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm text-ink">
            <Checkbox
              id="privacyAccepted"
              className="mt-0.5"
              checked={privacyAccepted === true}
              onCheckedChange={(checked) => setValue("privacyAccepted", checked === true, { shouldValidate: true })}
            />
            <span>
              <label htmlFor="privacyAccepted">{t("privacyPrefix")}</label>{" "}
              <Link href="/privacy" onClick={preserveSafeDraft} className="font-medium underline">
                {t("privacyLink")}
              </Link>
              . {t("privacyBack")}
            </span>
          </div>
          {errors.privacyAccepted?.message && <p className="text-sm text-red-600">{tErrors(String(errors.privacyAccepted.message))}</p>}
          {serverError && <p className="text-sm text-red-600">{serverError}</p>}
          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? t("creatingAccount") : t("createAccount")}
          </Button>
        </form>
        <div className="flex items-center gap-3 text-xs text-ink-muted">
          <span className="h-px flex-1 bg-border" />
          {t("orDivider")}
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button asChild variant="outline">
          <a href="/api/auth/google">
            <GoogleIcon />
            {t("continueWithGoogle")}
          </a>
        </Button>
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
