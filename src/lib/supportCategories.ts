// Category is stored as free text (SupportTicket.category), not a DB enum - this list is the
// single source of truth for both the New Ticket select values and the i18n key each maps to,
// so ticket lists can translate a category back to its label regardless of active locale.
export const SUPPORT_CATEGORIES = [
  { value: "Order Issue", key: "orderIssue" },
  { value: "Return / Refund", key: "returnRefund" },
  { value: "Product Question", key: "productQuestion" },
  { value: "Shipping", key: "shipping" },
  { value: "Loyalty & Wallet", key: "loyaltyWallet" },
  { value: "General", key: "general" },
] as const;

export function supportCategoryKey(value: string): string | undefined {
  return SUPPORT_CATEGORIES.find((c) => c.value === value)?.key;
}
