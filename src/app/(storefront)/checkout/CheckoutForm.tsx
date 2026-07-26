"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useCartStore } from "@/store/cart-store";
import { Button, Input, Card, CardContent, Checkbox } from "@/components/ui";
import { toast } from "@/lib/toast";
import { Money } from "@/components/Money";
import { localizedCity } from "@/lib/cityAr";
import { localizedField } from "@/lib/localizedField";
import type { AppLocale } from "@/i18n/config";

type Address = {
  id: string;
  label: string;
  recipientName: string;
  street: string;
  area: string;
  city: string;
  isDefaultShipping: boolean;
};
type PaymentMethod = { id: string; type: "CASH_ON_DELIVERY" | "MOCK_CARD"; label: string; isDefault: boolean };

const JORDAN_CITIES = ["Amman", "Zarqa", "Irbid", "Russeifa", "Aqaba", "As-Salt", "Mafraq"];

export function CheckoutForm({
  addresses: initialAddresses,
  paymentMethods: initialPaymentMethods,
  storeCreditBalance,
  loyaltyPointsBalance,
  loyaltyRedemptionRate,
}: {
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  storeCreditBalance: number;
  loyaltyPointsBalance: number;
  loyaltyRedemptionRate: number;
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
    city: JORDAN_CITIES[0],
    area: "",
    street: "",
  });

  const [paymentType, setPaymentType] = useState<"CASH_ON_DELIVERY" | "MOCK_CARD">(
    initialPaymentMethods[0]?.type ?? "CASH_ON_DELIVERY",
  );

  const [promoCode, setPromoCode] = useState("");
  const [promoResult, setPromoResult] = useState<{ discountAmount: number } | { error: string } | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);

  const [useStoreCredit, setUseStoreCredit] = useState(false);
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);

  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const subtotal = Number(subtotalRaw.toFixed(2));
  const discountAmount = promoResult && "discountAmount" in promoResult ? promoResult.discountAmount : 0;
  const storeCreditApplied = useStoreCredit ? Math.min(storeCreditBalance, subtotal - discountAmount) : 0;
  const loyaltyValue = useMemo(
    () => loyaltyPointsToRedeem * loyaltyRedemptionRate,
    [loyaltyPointsToRedeem, loyaltyRedemptionRate],
  );
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const shippingFee = selectedAddress?.city === "Amman" ? 0 : selectedAddress ? 3 : 0;
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
        paymentMethodType: paymentType,
        promoCode: promoResult && "discountAmount" in promoResult ? promoCode : undefined,
        useStoreCredit,
        loyaltyPointsToRedeem,
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
                  <p className="text-ink-muted">
                    {a.street}, {a.area}, {localizedCity(a.city, locale)}
                  </p>
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
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-secondary p-4">
                <Input
                  label={t("recipientName")}
                  value={newAddress.recipientName}
                  onChange={(e) => setNewAddress({ ...newAddress, recipientName: e.target.value })}
                />
                <Input
                  label={t("phone")}
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
                    {JORDAN_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {localizedCity(c, locale)}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label={t("area")}
                  value={newAddress.area}
                  onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })}
                />
                <Input
                  label={t("streetBuilding")}
                  value={newAddress.street}
                  onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                />
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-ink">{t("paymentMethod")}</h2>
          <p className="mt-1 text-xs text-ink-muted">{t("paymentMethodNote")}</p>
          <div className="mt-3 flex flex-col gap-3">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 has-[:checked]:border-cta">
              <input
                type="radio"
                name="payment"
                checked={paymentType === "CASH_ON_DELIVERY"}
                onChange={() => setPaymentType("CASH_ON_DELIVERY")}
              />
              <span className="text-sm font-medium text-ink">{t("cashOnDelivery")}</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 has-[:checked]:border-cta">
              <input
                type="radio"
                name="payment"
                checked={paymentType === "MOCK_CARD"}
                onChange={() => setPaymentType("MOCK_CARD")}
              />
              <span className="text-sm font-medium text-ink">{t("cardMock")}</span>
            </label>
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
