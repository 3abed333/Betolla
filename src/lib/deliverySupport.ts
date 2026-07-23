// Display labels for these now live in the i18n catalogs (common.deliveryProblemType /
// common.deliveryUrgency) since every consumer needs a translated string, not English text.
export const PROBLEM_TYPE_OPTIONS = [
  "CUSTOMER_UNREACHABLE",
  "WRONG_OR_INCOMPLETE_ADDRESS",
  "CUSTOMER_REFUSED_DELIVERY",
  "ITEM_DAMAGED",
  "PAYMENT_ISSUE_COD",
  "VEHICLE_OR_TRAFFIC_ISSUE",
  "SAFETY_CONCERN",
  "OTHER",
] as const;

export const URGENCY_OPTIONS = ["NORMAL", "URGENT"] as const;
