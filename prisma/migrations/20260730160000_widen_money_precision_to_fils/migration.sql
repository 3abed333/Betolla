-- AlterTable
-- Widen every money-value Decimal column from 2 decimal places to 3, matching the app's real
-- Jordanian dinar/fils precision (1 JD = 1000 fils) that the UI already displays everywhere.
-- Precision (first number) is also bumped by 1 so the max representable integer part is
-- unchanged - this is a pure, non-lossy widening; every existing value already fits.
ALTER TABLE "User" ALTER COLUMN "storeCreditBalance" TYPE DECIMAL(11,3);
ALTER TABLE "Product" ALTER COLUMN "price" TYPE DECIMAL(11,3);
ALTER TABLE "Product" ALTER COLUMN "compareAtPrice" TYPE DECIMAL(11,3);
ALTER TABLE "ProductBundle" ALTER COLUMN "bundlePrice" TYPE DECIMAL(11,3);
ALTER TABLE "CartItem" ALTER COLUMN "priceAtAdd" TYPE DECIMAL(11,3);
ALTER TABLE "Order" ALTER COLUMN "refundedAmount" TYPE DECIMAL(11,3);
ALTER TABLE "Order" ALTER COLUMN "subtotal" TYPE DECIMAL(11,3);
ALTER TABLE "Order" ALTER COLUMN "discountTotal" TYPE DECIMAL(11,3);
ALTER TABLE "Order" ALTER COLUMN "shippingFee" TYPE DECIMAL(11,3);
ALTER TABLE "Order" ALTER COLUMN "total" TYPE DECIMAL(11,3);
ALTER TABLE "Order" ALTER COLUMN "storeCreditUsed" TYPE DECIMAL(11,3);
ALTER TABLE "Order" ALTER COLUMN "loyaltyRedemptionValue" TYPE DECIMAL(11,3);
ALTER TABLE "OrderItem" ALTER COLUMN "priceSnapshot" TYPE DECIMAL(11,3);
ALTER TABLE "ReturnRequest" ALTER COLUMN "refundAmount" TYPE DECIMAL(11,3);
ALTER TABLE "WishlistItem" ALTER COLUMN "priceAtAdd" TYPE DECIMAL(11,3);
ALTER TABLE "StoreCreditTransaction" ALTER COLUMN "amount" TYPE DECIMAL(11,3);
ALTER TABLE "PromoCode" ALTER COLUMN "discountValue" TYPE DECIMAL(11,3);
ALTER TABLE "PromoCode" ALTER COLUMN "minOrderTotal" TYPE DECIMAL(11,3);
ALTER TABLE "PromoCodeUsage" ALTER COLUMN "discountAmount" TYPE DECIMAL(11,3);
ALTER TABLE "ShippingZone" ALTER COLUMN "fee" TYPE DECIMAL(11,3);
ALTER TABLE "DeliveryAssignment" ALTER COLUMN "earningsAmount" TYPE DECIMAL(11,3);
ALTER TABLE "CustomerStats" ALTER COLUMN "totalSpent" TYPE DECIMAL(13,3);
