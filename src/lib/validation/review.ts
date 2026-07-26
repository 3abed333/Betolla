import { z } from "zod";

export const createReviewSchema = z.object({
  orderItemId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
  photoUrl: z.string().trim().min(1).optional(),
});
