import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentSession } from "@/lib/auth/session";
import { ChangePasswordForm } from "./ChangePasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("changePassword");
  const tCommon = await getTranslations("common");
  return { title: t("metaTitle", { brand: tCommon("brand") }) };
}

export default async function ChangePasswordPage() {
  const session = await getCurrentSession({ allowPasswordChangeRequired: true });
  if (!session) redirect("/login");

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
