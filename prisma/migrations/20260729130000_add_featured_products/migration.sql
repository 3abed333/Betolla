-- Give staff and administrators explicit control over the products shown on the homepage.
ALTER TABLE "Product"
ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- Preserve the current homepage after deployment by marking its existing top eight products.
UPDATE "Product"
SET "isFeatured" = true
WHERE "id" IN (
  SELECT "id"
  FROM "Product"
  WHERE "isActive" = true
  ORDER BY "reviewCount" DESC, "createdAt" DESC
  LIMIT 8
);

CREATE INDEX "Product_isFeatured_isActive_idx"
ON "Product"("isFeatured", "isActive");
