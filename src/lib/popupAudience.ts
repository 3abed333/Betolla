import type { PopupAudienceValue, PopupSegmentValue } from "@/lib/popupCampaigns";

export type PopupAudienceCustomer = {
  userId: string;
  customerType: "INDIVIDUAL" | "PHARMACY";
  createdAt: Date;
  lastOrderAt: Date | null;
  totalSpent: number;
};

function typeMatches(audienceType: PopupAudienceValue | string, customer: PopupAudienceCustomer) {
  if (audienceType === "EVERYONE") return true;
  if (audienceType === "INDIVIDUAL_CUSTOMERS") return customer.customerType === "INDIVIDUAL";
  if (audienceType === "PHARMACIES") return customer.customerType === "PHARMACY";
  return false;
}

export function popupAudienceMatches(
  audienceType: PopupAudienceValue | string,
  segment: PopupSegmentValue | string,
  customer: PopupAudienceCustomer | null,
  population: PopupAudienceCustomer[],
  now = new Date(),
): boolean {
  if (!customer) return audienceType === "EVERYONE" && segment === "ALL";
  if (!typeMatches(audienceType, customer)) return false;
  if (segment === "ALL") return true;

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (segment === "NEW_CUSTOMERS") return customer.createdAt >= thirtyDaysAgo;

  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  if (segment === "INACTIVE_CUSTOMERS") {
    return customer.createdAt < thirtyDaysAgo && (!customer.lastOrderAt || customer.lastOrderAt < ninetyDaysAgo);
  }

  const comparable = population
    .filter((entry) => typeMatches(audienceType, entry))
    .sort((a, b) => a.totalSpent - b.totalSpent || a.userId.localeCompare(b.userId));
  const index = comparable.findIndex((entry) => entry.userId === customer.userId);
  if (index === -1) return false;
  const percentile = comparable.length === 1 ? 1 : index / (comparable.length - 1);
  if (segment === "TOP_30") return percentile >= 0.7;
  if (segment === "BOTTOM_30") return percentile <= 0.3;
  return false;
}
