import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { listActiveSessions } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";
import { RevokeSessionButton } from "./RevokeSessionButton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.sessions");
  const tCommon = await getTranslations("common");
  return { title: t("metaTitle", { brand: tCommon("brand") }) };
}

function describeSession(userAgent: string | null, t: Awaited<ReturnType<typeof getTranslations<"account.sessions">>>) {
  if (!userAgent) return t("device.unknown");
  if (/mobile/i.test(userAgent)) return t("device.mobile");
  if (/Windows/i.test(userAgent)) return t("device.windows");
  if (/Macintosh/i.test(userAgent)) return t("device.mac");
  return t("device.browser");
}

export default async function SessionsPage() {
  const session = await requireRole("CUSTOMER");
  const sessions = await listActiveSessions(session.userId);
  const t = await getTranslations("account.sessions");
  const locale = (await getLocale()) as AppLocale;

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div>
        <h2 className="font-heading text-xl font-semibold text-ink">{t("heading")}</h2>
        <p className="text-sm text-ink-muted">{t("description")}</p>
      </div>
      {sessions.map((s) => (
        <Card key={s.id}>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-ink">
                {describeSession(s.userAgent, t)}
                {s.id === session.sessionId && (
                  <span className="ms-2 text-xs text-success">{t("thisDevice")}</span>
                )}
              </p>
              <p className="text-sm text-ink-muted">
                {t("lastActivePrefix")}{" "}
                <FormattedDate date={s.lastActiveAt} locale={locale} opts={{ dateStyle: "medium", timeStyle: "short" }} />
              </p>
            </div>
            {s.id !== session.sessionId && <RevokeSessionButton sessionId={s.id} />}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
