import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { PopupManagementClient } from "@/components/PopupManagementClient";

export const metadata: Metadata = { title: "Popups - Betolla Admin" };

export default async function AdminPopupsPage() {
  const popups = await prisma.popupCampaign.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <PopupManagementClient
      popups={popups.map((popup) => ({
        ...popup,
        startsAt: popup.startsAt?.toISOString() ?? null,
        endsAt: popup.endsAt?.toISOString() ?? null,
      }))}
    />
  );
}
