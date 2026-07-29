CREATE TYPE "PopupTrigger" AS ENUM (
  'ANY_STOREFRONT_PAGE',
  'HOME_PAGE',
  'PRODUCTS',
  'PRODUCT_DETAIL',
  'CART',
  'CHECKOUT',
  'BLOG',
  'BUNDLES'
);

ALTER TABLE "PopupCampaign"
  ADD COLUMN "trigger" "PopupTrigger" NOT NULL DEFAULT 'ANY_STOREFRONT_PAGE',
  ADD COLUMN "imageUrl" TEXT;

CREATE INDEX "PopupCampaign_trigger_isActive_idx"
  ON "PopupCampaign"("trigger", "isActive");
