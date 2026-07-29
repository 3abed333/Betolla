import { z } from "zod";

export const createPaymentMethodSchema = z.object({
  type: z.literal("CASH_ON_DELIVERY"),
  isDefault: z.boolean().optional(),
});
