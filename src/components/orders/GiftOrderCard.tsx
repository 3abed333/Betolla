import { getTranslations } from "next-intl/server";

type GiftOrderCardProps = {
  occasion: string | null;
  recipientName: string | null;
  message: string | null;
  compact?: boolean;
};

const OCCASION_KEYS: Record<string, "birthday" | "love" | "celebration" | "thankYou" | "other"> = {
  BIRTHDAY: "birthday",
  LOVE: "love",
  CELEBRATION: "celebration",
  THANK_YOU: "thankYou",
  OTHER: "other",
};

export async function GiftOrderCard({ occasion, recipientName, message, compact = false }: GiftOrderCardProps) {
  const t = await getTranslations("common.gift");
  const occasionKey = OCCASION_KEYS[occasion ?? ""] ?? "other";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-accent/50 bg-[linear-gradient(135deg,var(--surface-secondary),var(--highlight))] p-5">
      <span className="pointer-events-none absolute start-2 top-1 text-2xl text-accent/60" aria-hidden>✦</span>
      <span className="pointer-events-none absolute end-3 top-2 text-xl text-accent/60" aria-hidden>♡</span>
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-cta-foreground">{t("badge")}</span>
          <p className="font-heading text-lg font-semibold text-ink">{t(`occasions.${occasionKey}`)}</p>
        </div>
        {!compact && (
          <div className="mt-3 space-y-2 text-sm text-ink">
            {recipientName && <p><span className="font-semibold">{t("recipient")}:</span> {recipientName}</p>}
            {message && <p className="whitespace-pre-wrap italic">“{message}”</p>}
            {!recipientName && !message && <p className="text-ink-muted">{t("noPersonalMessage")}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
