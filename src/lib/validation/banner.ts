import { z } from "zod";
import { getYouTubeVideoId } from "@/lib/youtube";

const optionalText = z.string().trim().max(300).nullable().optional();
const optionalUrl = z.string().trim().max(1000).nullable().optional();

export const bannerSchema = z.object({
  mediaType: z.enum(["IMAGE", "VIDEO", "YOUTUBE"]),
  desktopMediaUrl: z.string().trim().min(1).max(1000),
  mobileMediaUrl: optionalUrl,
  posterUrl: optionalUrl,
  titleEn: z.string().trim().min(1).max(200),
  titleAr: z.string().trim().min(1).max(200),
  subtitleEn: optionalText,
  subtitleAr: optionalText,
  ctaLabelEn: optionalText,
  ctaLabelAr: optionalText,
  linkUrl: optionalUrl,
  focalPointX: z.number().int().min(0).max(100),
  focalPointY: z.number().int().min(0).max(100),
  sortOrder: z.number().int().min(0).max(9999),
  autoAdvanceSeconds: z.number().int().min(3).max(30),
  isActive: z.boolean(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End time must be after start time" });
  }
  if (value.mediaType === "VIDEO" && !value.posterUrl) {
    ctx.addIssue({ code: "custom", path: ["posterUrl"], message: "A poster image is required for video banners" });
  }
  if (value.mediaType === "YOUTUBE" && !getYouTubeVideoId(value.desktopMediaUrl)) {
    ctx.addIssue({
      code: "custom",
      path: ["desktopMediaUrl"],
      message: "Enter a valid YouTube video link",
    });
  }
});

export type BannerInput = z.infer<typeof bannerSchema>;
