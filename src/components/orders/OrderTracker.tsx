import { getTranslations, getLocale } from "next-intl/server";
import { cn } from "@/lib/cn";
import { FormattedDate } from "@/components/FormattedDate";
import type { AppLocale } from "@/i18n/config";

const STEP_KEYS = ["PENDING", "CONFIRMED", "ON_DELIVERY", "DELIVERED"] as const;

export async function OrderTracker({
  status,
  history,
}: {
  status: string;
  history: { status: string; createdAt: Date; note: string | null }[];
}) {
  const t = await getTranslations("common.orderTracker");
  const locale = (await getLocale()) as AppLocale;

  if (status === "CANCELLED") {
    const cancelledEntry = history.find((h) => h.status === "CANCELLED");
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
        <p className="font-medium text-red-700 dark:text-red-300">{t("cancelled")}</p>
        {cancelledEntry?.note && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{cancelledEntry.note}</p>}
        {cancelledEntry && (
          <p className="mt-1 text-xs text-ink-muted">
            <FormattedDate date={cancelledEntry.createdAt} locale={locale} opts={{ dateStyle: "medium", timeStyle: "short" }} />
          </p>
        )}
      </div>
    );
  }

  const currentIndex = STEP_KEYS.findIndex((s) => s === status);
  const timestampFor = (key: string) => history.find((h) => h.status === key)?.createdAt;

  return (
    <div className="flex flex-col gap-0 sm:flex-row">
      {STEP_KEYS.map((key, i) => {
        const done = i <= currentIndex;
        const timestamp = timestampFor(key);
        return (
          <div key={key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1 text-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                  done ? "bg-success text-cta-foreground" : "bg-surface-secondary text-ink-muted",
                )}
              >
                {done ? "✓" : i + 1}
              </div>
              <p className={cn("text-xs font-medium", done ? "text-ink" : "text-ink-muted")}>{t(`steps.${key}`)}</p>
              {timestamp && (
                <p className="text-[11px] text-ink-muted">
                  <FormattedDate date={timestamp} locale={locale} opts={{ dateStyle: "short", timeStyle: "short" }} />
                </p>
              )}
            </div>
            {i < STEP_KEYS.length - 1 && (
              <div className={cn("mx-2 hidden h-0.5 flex-1 sm:block", done && i < currentIndex ? "bg-success" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
