import { z } from "zod";

export const bundleSchema = z.object({
  nameEn: z.string().trim().min(1).max(200),
  nameAr: z.string().trim().min(1).max(200),
  descriptionEn: z.string().trim().min(1).max(4000),
  descriptionAr: z.string().trim().min(1).max(4000),
  bundlePrice: z.number().positive(),
  mainImageUrl: z.string().min(1),
  isActive: z.boolean().default(true),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive() })).min(1),
});
