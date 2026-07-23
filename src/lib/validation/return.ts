import { z } from "zod";

export const createReturnSchema = z.object({
  orderId: z.string().min(1),
  orderItemId: z.string().min(1),
  quantity: z.number().int().positive(),
  reason: z.string().trim().min(1).max(60),
  reasonNote: z.string().trim().max(1000).optional(),
});
