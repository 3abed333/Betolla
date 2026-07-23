-- CreateEnum
CREATE TYPE "DeliveryProblemType" AS ENUM ('CUSTOMER_UNREACHABLE', 'WRONG_OR_INCOMPLETE_ADDRESS', 'CUSTOMER_REFUSED_DELIVERY', 'ITEM_DAMAGED', 'PAYMENT_ISSUE_COD', 'VEHICLE_OR_TRAFFIC_ISSUE', 'SAFETY_CONCERN', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportUrgency" AS ENUM ('NORMAL', 'URGENT');

-- CreateTable
CREATE TABLE "DeliverySupportTicket" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "deliveryAssignmentId" TEXT,
    "problemType" "DeliveryProblemType" NOT NULL,
    "description" TEXT,
    "photoUrl" TEXT,
    "urgency" "ReportUrgency" NOT NULL DEFAULT 'NORMAL',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "staffNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverySupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliverySupportTicket_driverId_idx" ON "DeliverySupportTicket"("driverId");

-- CreateIndex
CREATE INDEX "DeliverySupportTicket_status_idx" ON "DeliverySupportTicket"("status");

-- CreateIndex
CREATE INDEX "DeliverySupportTicket_assignedToId_idx" ON "DeliverySupportTicket"("assignedToId");

-- CreateIndex
CREATE INDEX "DeliverySupportTicket_deliveryAssignmentId_idx" ON "DeliverySupportTicket"("deliveryAssignmentId");

-- AddForeignKey
ALTER TABLE "DeliverySupportTicket" ADD CONSTRAINT "DeliverySupportTicket_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverySupportTicket" ADD CONSTRAINT "DeliverySupportTicket_deliveryAssignmentId_fkey" FOREIGN KEY ("deliveryAssignmentId") REFERENCES "DeliveryAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverySupportTicket" ADD CONSTRAINT "DeliverySupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
