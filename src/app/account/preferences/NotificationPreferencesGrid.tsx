"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui";

const CATEGORY_KEYS = ["ORDER_UPDATES", "PROMOTIONS", "BACK_IN_STOCK", "LOYALTY_AND_WALLET", "SUPPORT"] as const;
const CHANNEL_KEYS = ["EMAIL", "PUSH", "IN_APP"] as const;

type Preference = { category: string; channel: string; enabled: boolean };

export function NotificationPreferencesGrid() {
  const queryClient = useQueryClient();
  const t = useTranslations("account.preferences");
  const { data } = useQuery({
    queryKey: ["notificationPreferences"],
    queryFn: async (): Promise<Preference[]> => {
      const res = await fetch("/api/notification-preferences");
      const json = await res.json();
      return json.preferences;
    },
  });

  function isEnabled(category: string, channel: string) {
    return data?.find((p) => p.category === category && p.channel === channel)?.enabled ?? false;
  }

  async function toggle(category: string, channel: string, next: boolean) {
    queryClient.setQueryData<Preference[]>(["notificationPreferences"], (prev) => {
      const rest = (prev ?? []).filter((p) => !(p.category === category && p.channel === channel));
      return [...rest, { category, channel, enabled: next }];
    });
    await fetch("/api/notification-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, channel, enabled: next }),
    });
  }

  const rows = CATEGORY_KEYS.map((catKey) => (
    <div key={catKey} className="rounded-xl border border-border p-4">
      <p className="mb-3 font-medium text-ink">{t(`categories.${catKey}`)}</p>
      <div className="grid grid-cols-2 gap-3">
        {CHANNEL_KEYS.map((chKey) => (
          <label key={chKey} className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-sm text-ink-muted">
            <span>{t(`channels.${chKey}`)}</span>
            <Switch checked={isEnabled(catKey, chKey)} onCheckedChange={(checked) => toggle(catKey, chKey, checked === true)} />
          </label>
        ))}
      </div>
    </div>
  ));

  return (
    <>
      <p className="mb-4 rounded-xl border border-border bg-surface-secondary p-4 text-sm text-ink-muted">
        {t("pushExplanation")}
      </p>
      <div className="grid gap-3 sm:hidden">{rows}</div>
      <div className="hidden overflow-x-auto sm:block">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="p-2 text-start text-ink-muted">{t("categoryColumnHeader")}</th>
            {CHANNEL_KEYS.map((key) => (
              <th key={key} className="p-2 text-center text-ink-muted">
                {t(`channels.${key}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CATEGORY_KEYS.map((catKey) => (
            <tr key={catKey} className="border-t border-border">
              <td className="p-2 text-ink">{t(`categories.${catKey}`)}</td>
              {CHANNEL_KEYS.map((chKey) => (
                <td key={chKey} className="p-2 text-center">
                  <Switch
                    checked={isEnabled(catKey, chKey)}
                    onCheckedChange={(checked) => toggle(catKey, chKey, checked === true)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}
