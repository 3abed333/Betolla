import { z } from "zod";

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        kind: z.enum(["product", "bundle"]),
        id: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, "Your cart is empty"),
  shippingAddressId: z.string().min(1),
  paymentMethodType: z.enum(["CASH_ON_DELIVERY", "MOCK_CARD"]),
  promoCode: z.string().trim().optional(),
  useStoreCredit: z.boolean().default(false),
  loyaltyPointsToRedeem: z.number().int().min(0).default(0),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
