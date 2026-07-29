-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "apartmentNo" TEXT,
ADD COLUMN     "deliveryNotes" TEXT,
ADD COLUMN     "floor" TEXT,
ADD COLUMN     "landmark" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "shippingDeliveryNotes" TEXT,
ADD COLUMN     "shippingRecipientPhone" TEXT;
