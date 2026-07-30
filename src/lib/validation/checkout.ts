import { z } from "zod";

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        kind: z.enum(["product", "bundle"]),
        id: z.string().min(1).max(64),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1, "Your cart is empty")
    .max(100, "Too many cart items"),
  shippingAddressId: z.string().min(1),
  paymentMethodType: z.literal("CASH_ON_DELIVERY"),
  promoCode: z.string().trim().optional(),
  useStoreCredit: z.boolean().default(false),
  loyaltyPointsToRedeem: z.number().int().min(0).default(0),
  isGift: z.boolean().default(false),
  giftOccasion: z.enum(["BIRTHDAY", "LOVE", "CELEBRATION", "THANK_YOU", "OTHER"]).optional(),
  giftRecipientName: z.string().trim().max(100).optional(),
  giftMessage: z.string().trim().max(500).optional(),
  idempotencyKey: z.uuid(),
}).superRefine((value, context) => {
  if (value.isGift && !value.giftOccasion) {
    context.addIssue({
      code: "custom",
      path: ["giftOccasion"],
      message: "Choose a gift occasion",
    });
  }
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
