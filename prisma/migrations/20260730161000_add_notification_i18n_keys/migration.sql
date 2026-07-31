-- AlterTable
-- Adds locale-aware rendering support to Notification: title/body stay as the English fallback,
-- titleKey/bodyKey/params let the UI translate at render time using the viewer's own locale.
-- Nullable, no backfill - existing rows simply have no key and keep rendering their stored text.
ALTER TABLE "Notification" ADD COLUMN "titleKey" TEXT;
ALTER TABLE "Notification" ADD COLUMN "bodyKey" TEXT;
ALTER TABLE "Notification" ADD COLUMN "params" JSONB;
