-- AlterTable
ALTER TABLE "DeliveryAssignment" ADD COLUMN     "comment" TEXT,
ADD COLUMN     "rating" INTEGER;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "photoUrl" TEXT;
