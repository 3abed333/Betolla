import "server-only";
import { Resend } from "resend";
import { createTranslator } from "next-intl";
import { logError, logWarn } from "@/lib/server/logger";
import { dirForLocale, type AppLocale } from "@/i18n/config";
import { formatCurrency } from "@/lib/format";

let cachedClient: Resend | null = null;
let checkedEnv = false;

function getClient(): Resend | null {
  if (!checkedEnv) {
    checkedEnv = true;
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) cachedClient = new Resend(apiKey);
  }
  return cachedClient;
}

function appUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Betolla's real light-theme tokens (src/app/globals.css) - kept in sync by hand since email
// clients can't read CSS custom properties.
const SURFACE = "#faf7f2", INK = "#2b2926", INK_MUTED = "#6b655d", CTA = "#1b4332", ACCENT = "#c1662f", BORDER = "#e8dfcf";

export type OrderReceiptLine = { name: string; quantity: number; unitPrice: number };
export type OrderReceipt = {
  orderNumber: string;
  datePlaced: Date;
  paymentMethodLabel: string;
  statusLabel: string;
  items: OrderReceiptLine[];
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  storeCreditUsed: number;
  loyaltyRedemptionValue: number;
  total: number;
};

type ReceiptLabels = {
  orderConfirmation: string;
  datePlaced: string;
  payment: string;
  status: string;
  qty: string;
  subtotal: string;
  youSaved: string;
  storeCreditUsed: string;
  loyaltyPointsUsed: string;
  shipping: string;
  total: string;
  viewFullOrderDetails: string;
  viewOrder: string;
  returnToCart: string;
  viewWallet: string;
  viewTicket: string;
  viewProduct: string;
};

function money(value: number, locale: AppLocale) {
  return `<span dir="ltr">${escapeHtml(formatCurrency(value, locale))}</span>`;
}

function renderReceiptSection(receipt: OrderReceipt, locale: AppLocale, labels: ReceiptLabels) {
  const dir = dirForLocale(locale);
  const itemRows = receipt.items
    .map(
      (item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f2ece0;">
        <p style="margin:0 0 2px;font-size:13px;color:${INK};font-weight:600;">${escapeHtml(item.name)}</p>
        <p style="margin:0;font-size:11.5px;color:${INK_MUTED};">${item.quantity} &times; ${money(item.unitPrice, locale)}</p>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #f2ece0;text-align:${dir === "rtl" ? "left" : "right"};vertical-align:top;font-size:13px;color:${INK};">${money(item.unitPrice * item.quantity, locale)}</td>
    </tr>`,
    )
    .join("");

  const totalRow = (label: string, value: string, opts?: { bold?: boolean; color?: string }) => `
    <tr>
      <td style="padding:5px 0;font-size:${opts?.bold ? "14px" : "12.5px"};color:${opts?.color ?? INK_MUTED};font-weight:${opts?.bold ? "700" : "400"};">${label}</td>
      <td style="padding:5px 0;text-align:${dir === "rtl" ? "left" : "right"};font-size:${opts?.bold ? "14px" : "12.5px"};color:${opts?.color ?? INK};font-weight:${opts?.bold ? "700" : "400"};">${value}</td>
    </tr>`;

  return `
<tr><td style="padding:20px 34px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
    ${itemRows}
  </table>
</td></tr>
<tr><td style="padding:14px 34px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${totalRow(labels.subtotal, money(receipt.subtotal, locale))}
    ${receipt.discountTotal > 0 ? totalRow(labels.youSaved, `&minus;${money(receipt.discountTotal, locale)}`, { color: ACCENT }) : ""}
    ${receipt.storeCreditUsed > 0 ? totalRow(labels.storeCreditUsed, `&minus;${money(receipt.storeCreditUsed, locale)}`) : ""}
    ${receipt.loyaltyRedemptionValue > 0 ? totalRow(labels.loyaltyPointsUsed, `&minus;${money(receipt.loyaltyRedemptionValue, locale)}`) : ""}
    ${totalRow(labels.shipping, receipt.shippingFee > 0 ? money(receipt.shippingFee, locale) : money(0, locale))}
  </table>
  <div style="border-top:1px solid ${BORDER};margin:10px 0;"></div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${totalRow(labels.total, money(receipt.total, locale), { bold: true, color: INK })}
  </table>
</td></tr>`;
}

// Inline-styled table layout (no external stylesheet, no CSS custom properties) since email
// clients can't be relied on to support either. Sharp corners, no shadows, a single restrained
// accent - modeled on how Aesop/Glossier actually build their own transactional emails (checked
// their live sites directly), not on generic marketing-template conventions.
function renderEmailHtml(params: {
  title: string;
  body: string;
  locale: AppLocale;
  ctaUrl?: string;
  ctaLabel?: string;
  receipt?: OrderReceipt;
  receiptLabels?: ReceiptLabels;
}) {
  const dir = dirForLocale(params.locale);
  const align = dir === "rtl" ? "right" : "left";
  const title = escapeHtml(params.title);
  const body = escapeHtml(params.body);
  const receiptHtml =
    params.receipt && params.receiptLabels ? renderReceiptSection(params.receipt, params.locale, params.receiptLabels) : "";
  const metaRows =
    params.receipt && params.receiptLabels
      ? `
    <tr><td style="padding:9px 0;color:${INK_MUTED};border-bottom:1px solid #f2ece0;font-size:12.5px;">${params.receiptLabels.datePlaced}</td><td style="padding:9px 0;text-align:${dir === "rtl" ? "left" : "right"};color:${INK};border-bottom:1px solid #f2ece0;font-size:12.5px;">${escapeHtml(new Intl.DateTimeFormat(params.locale === "ar" ? "ar" : "en", { dateStyle: "medium" }).format(params.receipt.datePlaced))}</td></tr>
    <tr><td style="padding:9px 0;color:${INK_MUTED};border-bottom:1px solid #f2ece0;font-size:12.5px;">${params.receiptLabels.payment}</td><td style="padding:9px 0;text-align:${dir === "rtl" ? "left" : "right"};color:${INK};border-bottom:1px solid #f2ece0;font-size:12.5px;">${escapeHtml(params.receipt.paymentMethodLabel)}</td></tr>
    <tr><td style="padding:9px 0;color:${INK_MUTED};font-size:12.5px;">${params.receiptLabels.status}</td><td style="padding:9px 0;text-align:${dir === "rtl" ? "left" : "right"};color:${CTA};font-weight:700;font-size:12.5px;">${escapeHtml(params.receipt.statusLabel)}</td></tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="${params.locale}" dir="${dir}">
  <body style="margin:0;padding:0;background-color:${SURFACE};font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${SURFACE};padding:40px 16px;">
      <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background-color:#ffffff;border:1px solid ${BORDER};${params.receipt ? `border-top:3px solid ${CTA};` : ""}">
        <tr><td style="padding:24px 34px 4px;">
          <img src="${appUrl("/brand/betolla-logo-email.png")}" width="120" height="40" alt="Betolla Cosmetics" style="display:block;border:0;outline:none;" />
        </td></tr>
        <tr><td style="padding:${params.receipt ? "22" : "28"}px 34px 0;text-align:${align};direction:${dir};">
          ${params.receipt ? `<p style="margin:0 0 4px;font-size:11px;letter-spacing:0.08em;color:${ACCENT};text-transform:uppercase;font-weight:700;">${escapeHtml(params.receiptLabels!.orderConfirmation)}</p>` : ""}
          <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:${INK};">${title}</p>
          <p style="margin:0;font-size:14px;line-height:1.6;color:${INK_MUTED};">${body}</p>
          ${params.receipt ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:12.5px;margin-top:16px;">${metaRows}</table>` : ""}
        </td></tr>
        ${receiptHtml}
        <tr><td style="padding:26px 34px 32px;">
          ${
            params.ctaUrl && params.ctaLabel
              ? `<a href="${escapeHtml(params.ctaUrl)}" style="display:${params.receipt ? "block" : "inline-block"};${params.receipt ? "text-align:center;" : ""}background-color:${params.receipt ? INK : CTA};color:${SURFACE};font-size:${params.receipt ? "12.5px" : "13.5px"};font-weight:600;text-decoration:none;padding:${params.receipt ? "13px 0" : "13px 32px"};${params.receipt ? "letter-spacing:0.03em;" : ""}">${escapeHtml(params.receipt ? params.receiptLabels!.viewFullOrderDetails.toUpperCase() : params.ctaLabel)}</a>`
              : ""
          }
        </td></tr>
        <tr><td style="padding:16px 34px;border-top:1px solid ${BORDER};text-align:center;">
          <p style="margin:0;font-size:11px;color:${INK_MUTED};">Betolla Cosmetics · Amman, Jordan</p>
        </td></tr>
      </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/**
 * Best-effort real send for the EMAIL channel - never throws, so a Resend outage or a missing
 * RESEND_API_KEY never breaks the caller (notify() has already written the in-app Notification
 * row by the time this runs). Silently no-ops when RESEND_API_KEY isn't set, same as the app's
 * behavior before this existed. Renders in the recipient's own stored locale, not the request's -
 * there is no "current viewer" for an email.
 */
export async function sendNotificationEmail(params: {
  to: string;
  locale: AppLocale;
  title: string;
  body: string;
  titleKey?: string;
  bodyKey?: string;
  templateParams?: Record<string, string | number>;
  ctaPath?: string;
  ctaLabelKey?: "viewOrder" | "returnToCart" | "viewWallet" | "viewTicket" | "viewProduct";
  receipt?: OrderReceipt;
}) {
  const resend = getClient();
  if (!resend) return;

  try {
    const messages = (await import(`../../i18n/messages/${params.locale}.json`)).default;
    const t = createTranslator({
      locale: params.locale,
      messages,
      namespace: "common.notificationEvents",
    });
    const title = params.titleKey && t.has(params.titleKey) ? t(params.titleKey, params.templateParams) : params.title;
    const body = params.bodyKey && t.has(params.bodyKey) ? t(params.bodyKey, params.templateParams) : params.body;

    const tReceipt = createTranslator({ locale: params.locale, messages, namespace: "common.orderReceiptEmail" });
    const receiptLabels: ReceiptLabels = {
      orderConfirmation: tReceipt("orderConfirmation"),
      datePlaced: tReceipt("datePlaced"),
      payment: tReceipt("payment"),
      status: tReceipt("status"),
      qty: tReceipt("qty"),
      subtotal: tReceipt("subtotal"),
      youSaved: tReceipt("youSaved"),
      storeCreditUsed: tReceipt("storeCreditUsed"),
      loyaltyPointsUsed: tReceipt("loyaltyPointsUsed"),
      shipping: tReceipt("shipping"),
      total: tReceipt("total"),
      viewFullOrderDetails: tReceipt("viewFullOrderDetails"),
      viewOrder: tReceipt("viewOrder"),
      returnToCart: tReceipt("returnToCart"),
      viewWallet: tReceipt("viewWallet"),
      viewTicket: tReceipt("viewTicket"),
      viewProduct: tReceipt("viewProduct"),
    };
    const ctaLabel = params.ctaLabelKey ? receiptLabels[params.ctaLabelKey] : undefined;
    const ctaUrl = params.ctaPath ? appUrl(params.ctaPath) : undefined;

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Betolla Cosmetics <onboarding@resend.dev>",
      to: params.to,
      subject: title,
      html: renderEmailHtml({
        title,
        body,
        locale: params.locale,
        ctaUrl,
        ctaLabel,
        receipt: params.receipt,
        receiptLabels: params.receipt ? receiptLabels : undefined,
      }),
    });
    if (error) {
      logWarn("notification_email_failed", { errorName: error.name, errorMessage: error.message });
    }
  } catch (error) {
    logError("notification_email_failed", error);
  }
}
