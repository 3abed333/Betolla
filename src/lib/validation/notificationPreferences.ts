import { z } from "zod";

export const updateNotificationPreferenceSchema = z.object({
  category: z.enum([
    "ORDER_UPDATES",
    "PROMOTIONS",
    "BACK_IN_STOCK",
    "LOYALTY_AND_WALLET",
    "SUPPORT",
    "DELIVERY_ASSIGNMENTS",
    "OPERATIONS",
  ]),
  channel: z.enum(["EMAIL", "SMS", "PUSH", "IN_APP"]),
  enabled: z.boolean(),
});
