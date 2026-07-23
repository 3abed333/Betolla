import { z } from "zod";

export const storeCreditAdjustmentSchema = z.object({
  amount: z.number().refine((v) => v !== 0, "Amount can't be zero"),
  reason: z.string().trim().min(3).max(300),
});
