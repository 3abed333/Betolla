import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NotificationPreferencesGrid } from "./NotificationPreferencesGrid";

export const metadata: Metadata = { title: "Preferences - Betolla Cosmetics" };

export default async function PreferencesPage() {
  await requireRole("CUSTOMER");
  const t = await getTranslations("account.preferences");

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>

      <Card>
        <CardHeader>
          <CardTitle>{t("interfaceTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-5 sm:gap-6">
          <div>
            <p className="text-sm font-medium text-ink">{t("theme")}</p>
            <div className="mt-2">
              <ThemeToggle />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-ink">{t("language")}</p>
            <div className="mt-2">
              <LanguageSwitcher />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("communicationTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationPreferencesGrid />
        </CardContent>
      </Card>
    </div>
  );
}
