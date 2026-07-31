-- AlterTable
-- Simplifies the address form: recipient name, phone, city, and optional delivery notes are
-- enough for Cash-on-Delivery in practice - the driver calls the recipient phone to coordinate.
-- Destructive by request: permanently drops the free-text area/street/building/floor/apartment/
-- landmark fields. Order.shippingAddressSnapshot is an already-frozen text string built at order
-- time, not a live reference to these columns, so past orders are unaffected.
ALTER TABLE "Address" DROP COLUMN "area";
ALTER TABLE "Address" DROP COLUMN "street";
ALTER TABLE "Address" DROP COLUMN "buildingInfo";
ALTER TABLE "Address" DROP COLUMN "floor";
ALTER TABLE "Address" DROP COLUMN "apartmentNo";
ALTER TABLE "Address" DROP COLUMN "landmark";
