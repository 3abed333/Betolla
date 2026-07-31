import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RegisterForm } from "./RegisterForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  const tCommon = await getTranslations("common");
  return { title: t("metaTitle", { brand: tCommon("brand") }) };
}

export default function RegisterPage() {
  return <RegisterForm />;
}
