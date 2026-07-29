import { z } from "zod";

const requiredText = z.string().trim().min(1).max(250);
const html = z.string().trim().min(1).max(100_000);
const optionalText = z.string().trim().max(500).optional().nullable();
const optionalUrl = z
  .string()
  .trim()
  .max(2_000)
  .refine(
    (value) => !value || value.startsWith("/") || /^https?:\/\//i.test(value),
    "Enter a valid https:// URL or an internal path beginning with /",
  )
  .optional()
  .nullable();

export const blogPostSchema = z.object({
  titleEn: requiredText,
  titleAr: requiredText,
  excerptEn: optionalText,
  excerptAr: optionalText,
  contentHtmlEn: html,
  contentHtmlAr: html,
  coverImageUrl: optionalUrl,
  isPublished: z.boolean().default(false),
});

export const faqSchema = z.object({
  questionEn: requiredText,
  questionAr: requiredText,
  answerHtmlEn: html,
  answerHtmlAr: html,
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  isActive: z.boolean().default(true),
});

export const popupCampaignSchema = z
  .object({
    name: requiredText,
    template: z.enum([
      "SALE",
      "ANNOUNCEMENT",
      "NEW_PRODUCT",
      "WELCOME",
      "LIMITED_TIME",
      "FREE_SHIPPING",
      "LOYALTY",
      "BACK_IN_STOCK",
      "EVENT",
      "CUSTOM",
    ]),
    trigger: z.enum([
      "ANY_STOREFRONT_PAGE",
      "HOME_PAGE",
      "PRODUCTS",
      "PRODUCT_DETAIL",
      "CART",
      "CHECKOUT",
      "BLOG",
      "BUNDLES",
    ]),
    audienceType: z.enum(["EVERYONE", "INDIVIDUAL_CUSTOMERS", "PHARMACIES"]),
    customerSegment: z.enum(["ALL", "TOP_30", "BOTTOM_30", "NEW_CUSTOMERS", "INACTIVE_CUSTOMERS"]),
    imageUrl: optionalUrl,
    titleEn: requiredText,
    titleAr: requiredText,
    announcementEn: optionalText,
    announcementAr: optionalText,
    bodyHtmlEn: html,
    bodyHtmlAr: html,
    ctaLabelEn: optionalText,
    ctaLabelAr: optionalText,
    ctaUrl: optionalUrl,
    isActive: z.boolean().default(false),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
  })
  .refine(
    (value) => !value.startsAt || !value.endsAt || new Date(value.endsAt) > new Date(value.startsAt),
    { message: "The end date must be after the start date", path: ["endsAt"] },
  );

export const siteSettingsSchema = z.object({
  whatsapp: z
    .string()
    .trim()
    .max(30)
    .regex(/^\+?[0-9\s-]*$/, "Use a phone number with digits only")
    .optional()
    .nullable(),
  instagramUrl: optionalUrl,
  facebookUrl: optionalUrl,
  linkedinUrl: optionalUrl,
});

export const staticPageSchema = z.object({
  titleEn: requiredText,
  titleAr: requiredText,
  contentHtmlEn: html,
  contentHtmlAr: html,
  isPublished: z.boolean().default(true),
});

export const productKnowledgeSchema = z.object({
  contentHtmlEn: z.string().trim().max(100_000),
  contentHtmlAr: z.string().trim().max(100_000),
  isActive: z.boolean().default(true),
});

export type BlogPostInput = z.infer<typeof blogPostSchema>;
export type FaqInput = z.infer<typeof faqSchema>;
export type PopupCampaignInput = z.infer<typeof popupCampaignSchema>;
