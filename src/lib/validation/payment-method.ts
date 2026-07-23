import { z } from "zod";

export const createPaymentMethodSchema = z.object({
  type: z.enum(["CASH_ON_DELIVERY", "MOCK_CARD"]),
  // Mock-only fields - never real card data. A real gateway (e.g. HyperPay/PayTabs for the
  // Jordan market, or Stripe) would tokenize the card client-side and only a token/last4
  // would ever reach this endpoint - see the checkout route's comment for the integration point.
  mockCardNumber: z.string().trim().regex(/^\d{4,19}$/).optional(),
  isDefault: z.boolean().optional(),
});
