"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useCartStore } from "@/store/cart-store";
import { Button, Input, Textarea, Card, CardContent, Checkbox } from "@/components/ui";
import { toast } from "@/lib/toast";
import { Money } from "@/components/Money";
import { localizedCity } from "@/lib/cityAr";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";
import { cn } from "@/lib/cn";

type Address = {
  id: string;
  label: string;
  recipientName: string;
  city: string;
  isDefaultShipping: boolean;
};

const GIFT_OCCASIONS = [
  { value: "BIRTHDAY", emoji: "🎈", labelKey: "birthday" },
  { value: "LOVE", emoji: "💕", labelKey: "love" },
  { value: "CELEBRATION", emoji: "🎉", labelKey: "celebration" },
  { value: "THANK_YOU", emoji: "🌹", labelKey: "thankYou" },
  { value: "OTHER", emoji: "🎁", labelKey: "other" },
] as const;

export function CheckoutForm({
  addresses: initialAddresses,
  storeCreditBalance,
  loyaltyPointsBalance,
  loyaltyRedemptionRate,
  shippingZones,
}: {
  addresses: Address[];
  storeCreditBalance: number;
  loyaltyPointsBalance: number;
  loyaltyRedemptionRate: number;
  shippingZones: { city: string; fee: number }[];
}) {
  const t = useTranslations("storefront.checkout");
  const tToast = useTranslations("toast");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const subtotalRaw = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clear);

  const [addresses, setAddresses] = useState(initialAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState(initialAddresses[0]?.id ?? "");
  const [showNewAddress, setShowNewAddress] = useState(initialAddresses.length === 0);
  const [newAddress, setNewAddress] = useState({
    label: t("defaultAddressLabel"),
    recipientName: "",
    phone: "",
    city: shippingZones[0]?.city ?? "",
    deliveryNotes: "",
  });

  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<{ discountAmount: number } | { error: string } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  const [useStoreCredit, setUseStoreCredit] = useState(false);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [isGift, setIsGift] = useState(false);
  const [giftOccasion, setGiftOccasion] = useState("");
  const [giftOccasionError, setGiftOccasionError] = useState(false);
  const [giftRecipientName, setGiftRecipientName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");

  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  // Keep the same key across a timeout/retry so the server returns the original order instead of
  // placing a second one.
  const idempotencyKey = useRef(crypto.randomUUID());

  const subtotal = Number(subtotalRaw.toFixed(3));
  const discountAmount = promoResult && "discountAmount" in promoResult ? promoResult.discountAmount : 0;
  const storeCreditApplied = useStoreCredit ? Math.min(storeCreditBalance, subtotal - discountAmount) : 0;
  const loyaltyValue = useMemo(
    () => loyaltyPointsToRedeem * loyaltyRedemptionRate,
    [loyaltyPointsToRedeem, loyaltyRedemptionRate],
  );
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const shippingCity = selectedAddress?.city ?? (showNewAddress ? newAddress.city : undefined);
  const shippingFee = shippingCity
    ? (shippingZones.find((zone) => zone.city === shippingCity)?.fee ?? 0)
    : 0;
  const estimatedTotal = Math.max(0, subtotal - discountAmount - storeCreditApplied - loyaltyValue) + shippingFee;

  async function validatePromo() {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    const res = await fetch("/api/promo-codes/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoCode, subtotal }),
    });
    const data = await res.json();
    setValidatingPromo(false);
    setPromoResult(res.ok ? { discountAmount: data.discountAmount } : { error: data.error });
  }

  async function saveNewAddress(): Promise<string | null> {
    const res = await fetch("/api/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newAddress, isDefaultShipping: addresses.length === 0 }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(tToast("couldntSaveAddressTitle"), data.error);
      return null;
    }
    setAddresses((prev) => [...prev, data.address]);
    return data.address.id;
  }

  async function placeOrder() {
    if (isGift && !giftOccasion) {
      setGiftOccasionError(true);
      document.getElementById("gift-experience")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setPlacingOrder(true);
    let addressId = selectedAddressId;
    if (showNewAddress || !addressId) {
      const savedId = await saveNewAddress();
      if (!savedId) {
        setPlacingOrder(false);
        return;
      }
      addressId = savedId;
    }

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ kind: i.kind, id: i.id, quantity: i.quantity })),
        shippingAddressId: addressId,
        paymentMethodType: "CASH_ON_DELIVERY",
        promoCode: promoResult && "discountAmount" in promoResult ? promoCode : undefined,
        useStoreCredit,
        loyaltyPointsToRedeem,
        isGift,
        giftOccasion: isGift ? giftOccasion : undefined,
        giftRecipientName: isGift ? giftRecipientName : undefined,
        giftMessage: isGift ? giftMessage : undefined,
        idempotencyKey: idempotencyKey.current,
      }),
    });
    const data = await res.json();
    setPlacingOrder(false);
    if (!res.ok) {
      toast.error(tToast("couldntPlaceOrderTitle"), data.error);
      return;
    }
    setOrderPlaced(true);
    clearCart();
    router.push(`/checkout/confirmation/${data.orderId}`);
  }

  if (items.length === 0) {
    return <p className="text-ink-muted">{orderPlaced ? t("redirecting") : t("cartEmpty")}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="flex flex-col gap-8 lg:col-span-2">
        <section>
          <h2 className="font-heading text-lg font-semibold text-ink">{t("shippingAddress")}</h2>
          <div className="mt-3 flex flex-col gap-3">
            {addresses.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 has-[:checked]:border-cta"
              >
                <input
                  type="radio"
                  name="address"
                  checked={!showNewAddress && selectedAddressId === a.id}
                  onChange={() => {
                    setSelectedAddressId(a.id);
                    setShowNewAddress(false);
                  }}
                  className="mt-1"
                />
                <div className="text-sm">
                  <p className="font-medium text-ink">
                    {a.label} - {a.recipientName}
                  </p>
                  <p className="text-ink-muted">{localizedCity(a.city, locale)}</p>
                </div>
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 has-[:checked]:border-cta">
              <input
                type="radio"
                name="address"
                checked={showNewAddress}
                onChange={() => setShowNewAddress(true)}
              />
              <span className="text-sm font-medium text-ink">{t("addNewAddress")}</span>
            </label>
            {showNewAddress && (
              <div className="grid grid-cols-1 gap-3 rounded-xl bg-surface-secondary p-4 sm:grid-cols-2">
                <Input
                  label={t("recipientName")}
                  value={newAddress.recipientName}
                  onChange={(e) => setNewAddress({ ...newAddress, recipientName: e.target.value })}
                />
                <Input
                  label={t("phone")}
                  type="tel"
                  dir="ltr"
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                />
                <div className="col-span-2">
                  <label className="text-sm font-medium text-ink">{t("city")}</label>
                  <select
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-4 text-sm text-ink"
                  >
                    {shippingZones.map(({ city: c }) => (
                      <option key={c} value={c}>
                        {localizedCity(c, locale)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-ink">{t("deliveryNotes")}</label>
                  <Textarea
                    placeholder={t("deliveryNotesPlaceholder")}
                    value={newAddress.deliveryNotes}
                    onChange={(e) => setNewAddress({ ...newAddress, deliveryNotes: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        <section
          id="gift-experience"
          data-occasion={isGift ? giftOccasion || "PICK" : "OFF"}
          className={cn(
            "gift-experience relative overflow-hidden rounded-[2rem] border p-6 sm:p-8",
            isGift && "gift-experience-active",
          )}
        >
          <div className="gift-background-icons pointer-events-none absolute inset-0" aria-hidden>
            <span>💕</span>
            <span>🎉</span>
            <span>🎈</span>
            <span>🎁</span>
            <span>🌹</span>
          </div>

          <label className="relative z-10 flex cursor-pointer items-center gap-4 sm:gap-6">
            <span className="gift-main-icon flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.75rem] text-5xl shadow-lg sm:h-24 sm:w-24 sm:text-6xl" aria-hidden>
              {giftOccasion ? (GIFT_OCCASIONS.find((occasion) => occasion.value === giftOccasion)?.emoji ?? "🎁") : "🎁"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-3">
                <Checkbox
                  checked={isGift}
                  onCheckedChange={(checked) => {
                    const enabled = checked === true;
                    setIsGift(enabled);
                    if (!enabled) setGiftOccasionError(false);
                  }}
                  className="h-7 w-7 shrink-0 rounded-lg [&_svg]:h-5 [&_svg]:w-5"
                />
                <span className="font-heading text-xl font-semibold text-ink sm:text-2xl">{t("sendAsGift")}</span>
              </span>
              <span className="mt-2 block text-sm leading-6 text-ink-muted sm:text-base">{t("sendAsGiftDescription")}</span>
              <span className="mt-3 flex flex-wrap gap-1.5 text-2xl sm:text-3xl" aria-hidden>
                <span>💕</span><span>🎉</span><span>🎈</span><span>🎁</span><span>🌹</span>
              </span>
            </span>
          </label>

          <div className={cn("gift-expand-grid relative z-10", isGift && "gift-expand-grid-open")}>
            <div className="gift-expand-inner">
              <div className="mt-7 border-t border-current/15 pt-6">
                <p className="font-heading text-lg font-semibold text-ink">{t("chooseGiftOccasion")}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {GIFT_OCCASIONS.map((occasion) => {
                    const selected = giftOccasion === occasion.value;
                    return (
                      <button
                        key={occasion.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          setGiftOccasion(occasion.value);
                          setGiftOccasionError(false);
                        }}
                        className={cn(
                          "gift-occasion-card flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-4 text-center transition-all",
                          selected && "gift-occasion-card-selected",
                        )}
                      >
                        <span className="text-4xl sm:text-5xl" aria-hidden>{occasion.emoji}</span>
                        <span className="text-sm font-semibold text-ink">{t(`giftOccasions.${occasion.labelKey}`)}</span>
                      </button>
                    );
                  })}
                </div>
                {giftOccasionError && (
                  <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{t("chooseGiftOccasionError")}</p>
                )}

                {giftOccasion && (
                  <div className="gift-details-enter mt-6 grid grid-cols-1 gap-5 rounded-3xl border border-white/25 bg-surface/80 p-5 shadow-lg backdrop-blur-md sm:grid-cols-2 sm:p-6">
                    <Input
                      label={t("giftRecipientName")}
                      value={giftRecipientName}
                      maxLength={100}
                      onChange={(event) => setGiftRecipientName(event.target.value)}
                      className="bg-surface/90"
                    />
                    <div className="sm:col-span-2">
                      <Textarea
                        label={t("giftMessage")}
                        value={giftMessage}
                        maxLength={500}
                        rows={5}
                        placeholder={t("giftMessagePlaceholder")}
                        onChange={(event) => setGiftMessage(event.target.value)}
                        className="bg-surface/90"
                      />
                      <p className="mt-1 text-end text-xs text-ink-faint">{giftMessage.length}/500</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-ink">{t("paymentMethod")}</h2>
          <p className="mt-1 text-xs text-ink-muted">{t("paymentMethodNote")}</p>
          <div className="mt-3 rounded-xl border border-cta bg-cta/5 p-4">
            <span className="text-sm font-medium text-ink">{t("cashOnDelivery")}</span>
          </div>
        </section>
      </div>

      <Card className="h-fit">
        <CardContent className="flex flex-col gap-4">
          <h2 className="font-heading text-lg font-semibold text-ink">{t("orderSummary")}</h2>
          <div className="flex flex-col gap-1 text-sm">
            {items.map((i) => (
              <div key={i.key} className="flex justify-between text-ink-muted">
                <span>
                  {localizedField(locale, i.nameEn, i.nameAr)} x{i.quantity}
                </span>
                <span>
                  <Money value={i.price * i.quantity} locale={locale} />
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder={t("promoCodePlaceholder")}
              value={promoCode}
              onChange={(e) => {
                setPromoCode(e.target.value);
                setPromoResult(null);
              }}
              className="h-10"
            />
            <Button type="button" variant="outline" size="sm" onClick={validatePromo} disabled={validatingPromo}>
              {t("apply")}
            </Button>
          </div>
          {promoResult && "error" in promoResult && <p className="text-xs text-red-600">{promoResult.error}</p>}
          {promoResult && "discountAmount" in promoResult && (
            <p className="text-xs text-success">
              {t.rich("promoApplied", {
                amount: () => <Money value={promoResult.discountAmount} locale={locale} />,
              })}
            </p>
          )}

          {storeCreditBalance > 0 && (
            <label className="flex items-center gap-2 text-sm text-ink">
              <Checkbox checked={useStoreCredit} onCheckedChange={(c) => setUseStoreCredit(c === true)} />
              {t.rich("useStoreCredit", {
                balance: () => <Money value={storeCreditBalance} locale={locale} />,
              })}
            </label>
          )}
          {loyaltyPointsBalance > 0 && (
            <div className="text-sm text-ink">
              <label className="flex items-center justify-between">
                <span>{t("redeemLoyaltyPoints", { count: loyaltyPointsBalance })}</span>
              </label>
              <input
                type="range"
                min={0}
                max={loyaltyPointsBalance}
                step={10}
                value={loyaltyPointsToRedeem}
                onChange={(e) => setLoyaltyPointsToRedeem(Number(e.target.value))}
                className="mt-2 w-full"
              />
              <p className="text-xs text-ink-muted">
                {t.rich("pointsEqualsValue", {
                  count: loyaltyPointsToRedeem,
                  value: () => <Money value={loyaltyValue} locale={locale} />,
                })}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-ink-muted">
              <span>{t("subtotal")}</span>
              <span>
                <Money value={subtotal} locale={locale} />
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-ink-muted">
                <span>{t("discount")}</span>
                <span>
                  -<Money value={discountAmount} locale={locale} />
                </span>
              </div>
            )}
            {storeCreditApplied > 0 && (
              <div className="flex justify-between text-ink-muted">
                <span>{t("storeCreditApplied")}</span>
                <span>
                  -<Money value={storeCreditApplied} locale={locale} />
                </span>
              </div>
            )}
            {loyaltyValue > 0 && (
              <div className="flex justify-between text-ink-muted">
                <span>{t("loyaltyPointsRedeemed")}</span>
                <span>
                  -<Money value={loyaltyValue} locale={locale} />
                </span>
              </div>
            )}
            <div className="flex justify-between text-ink-muted">
              <span>{t("shipping")}</span>
              <span>
                <Money value={shippingFee} locale={locale} />
              </span>
            </div>
            <div className="flex justify-between font-semibold text-ink">
              <span>{t("total")}</span>
              <span>
                <Money value={estimatedTotal} locale={locale} />
              </span>
            </div>
          </div>

          <Button onClick={placeOrder} disabled={placingOrder} className="w-full">
            {placingOrder ? t("placingOrder") : t("placeOrder")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
