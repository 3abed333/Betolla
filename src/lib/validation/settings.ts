import { z } from "zod";

export const loyaltyConfigSchema = z.object({
  pointsPerJdSpent: z.number().min(0),
  redemptionValuePerPoint: z.number().min(0),
});

export const loyaltyTierSchema = z.object({
  nameEn: z.string().trim().min(1).max(60),
  nameAr: z.string().trim().min(1).max(60),
  minPoints: z.number().int().min(0),
  sortOrder: z.number().int().min(0).default(0),
});

export const shippingZoneSchema = z.object({
  cityEn: z.string().trim().min(1).max(100),
  cityAr: z.string().trim().min(1).max(100),
  fee: z.number().min(0),
  estimatedDaysMin: z.number().int().positive().nullable().optional(),
  estimatedDaysMax: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true),
});
