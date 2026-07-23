import { z } from "zod";

export const promoCodeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores only")
      .transform((v) => v.toUpperCase()),
    discountType: z.enum(["PERCENTAGE", "FIXED"]),
    discountValue: z.number().positive(),
    minOrderTotal: z.number().min(0).default(0),
    targetSegment: z.enum(["ALL", "TOP_30", "BOTTOM_30"]).default("ALL"),
    startsAt: z.coerce.date().nullable().optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    usageLimitTotal: z.number().int().positive().nullable().optional(),
    usageLimitPerUser: z.number().int().positive().nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .refine((v) => v.discountType !== "PERCENTAGE" || v.discountValue <= 100, {
    message: "Percentage discounts can't exceed 100",
    path: ["discountValue"],
  });
