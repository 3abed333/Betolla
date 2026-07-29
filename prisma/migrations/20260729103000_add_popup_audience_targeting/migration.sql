CREATE TYPE "PopupAudienceType" AS ENUM (
  'EVERYONE',
  'INDIVIDUAL_CUSTOMERS',
  'PHARMACIES'
);

CREATE TYPE "PopupCustomerSegment" AS ENUM (
  'ALL',
  'TOP_30',
  'BOTTOM_30',
  'NEW_CUSTOMERS',
  'INACTIVE_CUSTOMERS'
);

ALTER TABLE "PopupCampaign"
  ADD COLUMN "audienceType" "PopupAudienceType" NOT NULL DEFAULT 'EVERYONE',
  ADD COLUMN "customerSegment" "PopupCustomerSegment" NOT NULL DEFAULT 'ALL';

CREATE INDEX "PopupCampaign_audienceType_customerSegment_isActive_idx"
  ON "PopupCampaign"("audienceType", "customerSegment", "isActive");
