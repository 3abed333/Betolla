CREATE TYPE "BannerMediaType" AS ENUM ('IMAGE', 'VIDEO');
CREATE TYPE "BannerEventType" AS ENUM ('IMPRESSION', 'CLICK');

ALTER TABLE "Banner"
ADD COLUMN "mediaType" "BannerMediaType" NOT NULL DEFAULT 'IMAGE',
ADD COLUMN "desktopMediaUrl" TEXT,
ADD COLUMN "mobileMediaUrl" TEXT,
ADD COLUMN "posterUrl" TEXT,
ADD COLUMN "subtitleEn" TEXT,
ADD COLUMN "subtitleAr" TEXT,
ADD COLUMN "ctaLabelEn" TEXT,
ADD COLUMN "ctaLabelAr" TEXT,
ADD COLUMN "focalPointX" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "focalPointY" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN "autoAdvanceSeconds" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "Banner"
SET "desktopMediaUrl" = "imageUrl",
    "updatedAt" = "createdAt";

ALTER TABLE "Banner"
ALTER COLUMN "desktopMediaUrl" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL,
DROP COLUMN "imageUrl";

CREATE TABLE "BannerEvent" (
    "id" TEXT NOT NULL,
    "bannerId" TEXT NOT NULL,
    "type" "BannerEventType" NOT NULL,
    "visitorId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BannerEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Banner_isActive_sortOrder_idx" ON "Banner"("isActive", "sortOrder");
CREATE INDEX "Banner_startsAt_endsAt_idx" ON "Banner"("startsAt", "endsAt");
CREATE INDEX "BannerEvent_createdAt_idx" ON "BannerEvent"("createdAt");
CREATE UNIQUE INDEX "BannerEvent_bannerId_type_visitorId_dateKey_key"
ON "BannerEvent"("bannerId", "type", "visitorId", "dateKey");

ALTER TABLE "BannerEvent"
ADD CONSTRAINT "BannerEvent_bannerId_fkey"
FOREIGN KEY ("bannerId") REFERENCES "Banner"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
