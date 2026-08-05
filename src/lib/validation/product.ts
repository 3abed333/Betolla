import { z } from "zod";

export const productSchema = z.object({
  sku: z.string().trim().min(1).max(40),
  nameEn: z.string().trim().min(1).max(200),
  nameAr: z.string().trim().min(1).max(200),
  descriptionEn: z.string().trim().min(1).max(20_000),
  descriptionAr: z.string().trim().min(1).max(20_000),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().nullable().optional(),
  stock: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).nullable().optional(),
  categoryId: z.string().min(1),
  mainImageUrl: z.string().min(1),
  galleryUrls: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  knowledgeHtmlEn: z.string().trim().max(100_000).optional().default(""),
  knowledgeHtmlAr: z.string().trim().max(100_000).optional().default(""),
  knowledgeActive: z.boolean().optional().default(false),
});

export type ProductInput = z.infer<typeof productSchema>;
