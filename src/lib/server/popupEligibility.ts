import "server-only";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth/session";
import { popupAudienceMatches, type PopupAudienceCustomer } from "@/lib/popupAudience";

export async function getEligiblePopupCampaigns(now = new Date()) {
  const popups = await prisma.popupCampaign.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      template: true,
      trigger: true,
      imageUrl: true,
      audienceType: true,
      customerSegment: true,
      titleEn: true,
      titleAr: true,
      announcementEn: true,
      announcementAr: true,
      bodyHtmlEn: true,
      bodyHtmlAr: true,
      ctaLabelEn: true,
      ctaLabelAr: true,
      ctaUrl: true,
    },
  });

  if (popups.length === 0) return popups;
  const session = await getCurrentSession();
  if (!session || session.role !== "CUSTOMER") {
    return popups.filter((popup) => popup.audienceType === "EVERYONE" && popup.customerSegment === "ALL");
  }

  const currentUser = await prisma.user.findFirst({
    where: { id: session.userId, role: "CUSTOMER", isActive: true },
    select: {
      id: true,
      customerType: true,
      createdAt: true,
      customerStats: {
        select: { totalSpent: true, lastOrderAt: true },
      },
    },
  });
  if (!currentUser) {
    return popups.filter((popup) => popup.audienceType === "EVERYONE" && popup.customerSegment === "ALL");
  }

  const customer: PopupAudienceCustomer = {
    userId: currentUser.id,
    customerType: currentUser.customerType,
    createdAt: currentUser.createdAt,
    totalSpent: Number(currentUser.customerStats?.totalSpent ?? 0),
    lastOrderAt: currentUser.customerStats?.lastOrderAt ?? null,
  };
  const needsSpendingRank = popups.some(
    (popup) => popup.customerSegment === "TOP_30" || popup.customerSegment === "BOTTOM_30",
  );
  if (!needsSpendingRank) {
    return popups.filter((popup) =>
      popupAudienceMatches(popup.audienceType, popup.customerSegment, customer, [customer], now),
    );
  }

  const users = await prisma.user.findMany({
    where: { role: "CUSTOMER", isActive: true },
    select: {
      id: true,
      customerType: true,
      createdAt: true,
      customerStats: {
        select: { totalSpent: true, lastOrderAt: true },
      },
    },
  });
  const population: PopupAudienceCustomer[] = users.map((user) => ({
    userId: user.id,
    customerType: user.customerType,
    createdAt: user.createdAt,
    totalSpent: Number(user.customerStats?.totalSpent ?? 0),
    lastOrderAt: user.customerStats?.lastOrderAt ?? null,
  }));

  return popups.filter((popup) =>
    popupAudienceMatches(popup.audienceType, popup.customerSegment, customer, population, now),
  );
}
