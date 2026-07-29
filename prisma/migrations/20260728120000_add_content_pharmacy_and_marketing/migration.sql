-- Additive content, pharmacy-profile, and storefront-marketing schema.
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'PHARMACY');
CREATE TYPE "StaticPageType" AS ENUM ('PRIVACY_POLICY', 'ABOUT_US');
CREATE TYPE "PopupTemplate" AS ENUM (
  'SALE',
  'ANNOUNCEMENT',
  'NEW_PRODUCT',
  'WELCOME',
  'LIMITED_TIME',
  'FREE_SHIPPING',
  'LOYALTY',
  'BACK_IN_STOCK',
  'EVENT',
  'CUSTOM'
);

ALTER TABLE "User"
  ADD COLUMN "customerType" "CustomerType" NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN "pharmacyName" TEXT,
  ADD COLUMN "pharmacyLocation" TEXT;

CREATE INDEX "User_customerType_idx" ON "User"("customerType");

CREATE TABLE "ProductKnowledge" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "contentHtmlEn" TEXT NOT NULL,
  "contentHtmlAr" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductKnowledge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductKnowledge_productId_key" ON "ProductKnowledge"("productId");
ALTER TABLE "ProductKnowledge"
  ADD CONSTRAINT "ProductKnowledge_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SiteSettings" (
  "id" TEXT NOT NULL,
  "whatsapp" TEXT,
  "instagramUrl" TEXT,
  "facebookUrl" TEXT,
  "linkedinUrl" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaticPage" (
  "id" TEXT NOT NULL,
  "type" "StaticPageType" NOT NULL,
  "titleEn" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "contentHtmlEn" TEXT NOT NULL,
  "contentHtmlAr" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaticPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaticPage_type_key" ON "StaticPage"("type");

CREATE TABLE "BlogPost" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "excerptEn" TEXT,
  "excerptAr" TEXT,
  "contentHtmlEn" TEXT NOT NULL,
  "contentHtmlAr" TEXT NOT NULL,
  "coverImageUrl" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "authorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");
CREATE INDEX "BlogPost_isPublished_publishedAt_idx" ON "BlogPost"("isPublished", "publishedAt");
CREATE INDEX "BlogPost_authorId_idx" ON "BlogPost"("authorId");
ALTER TABLE "BlogPost"
  ADD CONSTRAINT "BlogPost_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Faq" (
  "id" TEXT NOT NULL,
  "questionEn" TEXT NOT NULL,
  "questionAr" TEXT NOT NULL,
  "answerHtmlEn" TEXT NOT NULL,
  "answerHtmlAr" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Faq_isActive_sortOrder_idx" ON "Faq"("isActive", "sortOrder");

CREATE TABLE "PopupCampaign" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "template" "PopupTemplate" NOT NULL,
  "titleEn" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "announcementEn" TEXT,
  "announcementAr" TEXT,
  "bodyHtmlEn" TEXT NOT NULL,
  "bodyHtmlAr" TEXT NOT NULL,
  "ctaLabelEn" TEXT,
  "ctaLabelAr" TEXT,
  "ctaUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PopupCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PopupCampaign_isActive_startsAt_endsAt_idx"
  ON "PopupCampaign"("isActive", "startsAt", "endsAt");

-- SMS is no longer an available preference or delivery path. Keep the enum value and
-- historical Notification records for audit compatibility, but remove obsolete preferences.
DELETE FROM "NotificationPreference" WHERE "channel" = 'SMS';
