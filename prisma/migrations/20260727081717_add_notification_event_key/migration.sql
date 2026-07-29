-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "eventKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_channel_eventKey_key" ON "Notification"("userId", "channel", "eventKey");
