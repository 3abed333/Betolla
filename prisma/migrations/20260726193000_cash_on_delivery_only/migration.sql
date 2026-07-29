-- Preserve the immutable paymentMethodLabel on historical orders while removing
-- saved mock-card methods and the unsupported enum value.
DELETE FROM "PaymentMethod"
WHERE "type" = 'MOCK_CARD';

CREATE TYPE "PaymentMethodType_new" AS ENUM ('CASH_ON_DELIVERY');

ALTER TABLE "PaymentMethod"
ALTER COLUMN "type" TYPE "PaymentMethodType_new"
USING ("type"::text::"PaymentMethodType_new");

DROP TYPE "PaymentMethodType";
ALTER TYPE "PaymentMethodType_new" RENAME TO "PaymentMethodType";
