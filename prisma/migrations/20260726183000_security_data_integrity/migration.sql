ALTER TABLE "Order"
ADD COLUMN "checkoutKey" TEXT;

ALTER TABLE "Review"
ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false;

-- Preserve the visibility of historical reviews; newly submitted reviews queue for moderation.
UPDATE "Review" SET "isPublished" = true;

CREATE UNIQUE INDEX "Order_checkoutKey_key" ON "Order"("checkoutKey");
CREATE UNIQUE INDEX "ReturnRequestItem_orderItemId_key" ON "ReturnRequestItem"("orderItemId");
CREATE UNIQUE INDEX "Review_orderItemId_key" ON "Review"("orderItemId");

CREATE TABLE "OrderInventoryReservation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "OrderInventoryReservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderInventoryReservation_orderId_productId_key"
ON "OrderInventoryReservation"("orderId", "productId");
CREATE INDEX "OrderInventoryReservation_productId_idx"
ON "OrderInventoryReservation"("productId");

ALTER TABLE "OrderInventoryReservation"
ADD CONSTRAINT "OrderInventoryReservation_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderInventoryReservation"
ADD CONSTRAINT "OrderInventoryReservation_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ReturnStatusHistory" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL,
    "note" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReturnStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReturnStatusHistory_returnRequestId_idx"
ON "ReturnStatusHistory"("returnRequestId");

ALTER TABLE "ReturnStatusHistory"
ADD CONSTRAINT "ReturnStatusHistory_returnRequestId_fkey"
FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "UploadQuota" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "byteCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UploadQuota_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UploadQuota_userId_dayKey_key"
ON "UploadQuota"("userId", "dayKey");

-- PostgreSQL partial uniqueness is the database-level invariant that ensures an order can never
-- have two simultaneous active deliveries, even when two assignment requests race.
CREATE UNIQUE INDEX "DeliveryAssignment_one_active_per_order"
ON "DeliveryAssignment"("orderId")
WHERE "status" IN ('ASSIGNED', 'PICKED_UP', 'EN_ROUTE');
