type JsonRecord = Record<string, unknown>;

export type StaffActivityLog = {
  action: string;
  entityType: string;
  entityId: string | null;
  beforeData: unknown;
  afterData: unknown;
};

export type StaffFootprintPresentation = {
  filterKey: string;
  label: string;
  description: string;
  details: string[];
  href: string | null;
};

export const STAFF_FOOTPRINT_SOURCE_ACTIONS = [
  "PRODUCT_CREATE",
  "PRODUCT_UPDATE",
  "PRODUCT_DELETE",
  "PRODUCT_KNOWLEDGE_CREATE",
  "PRODUCT_KNOWLEDGE_UPDATE",
  "PRODUCT_KNOWLEDGE_DELETE",
  "BUNDLE_CREATE",
  "BUNDLE_UPDATE",
  "BUNDLE_DELETE",
  "BLOG_CREATE",
  "BLOG_UPDATE",
  "BLOG_DELETE",
  "ORDER_STATUS_CHANGE",
  "SUPPORT_TICKET_STATUS_UPDATE",
  "DELIVERY_SUPPORT_TICKET_STATUS_UPDATE",
  "DELIVERY_PASSWORD_RESET",
] as const;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(data: JsonRecord, key: string) {
  const value = data[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function bool(data: JsonRecord, key: string) {
  return typeof data[key] === "boolean" ? data[key] as boolean : null;
}

function changed(label: string, before: JsonRecord, after: JsonRecord, key: string) {
  const oldValue = before[key];
  const newValue = after[key];
  if (oldValue === undefined || newValue === undefined || oldValue === newValue) return null;
  if (typeof oldValue === "boolean" && typeof newValue === "boolean") {
    return `${label}: ${oldValue ? "Active" : "Inactive"} → ${newValue ? "Active" : "Inactive"}`;
  }
  return `${label}: ${String(oldValue)} → ${String(newValue)}`;
}

function entityHref(entityType: string, entityId: string | null) {
  if (!entityId) return null;
  if (entityType === "Product") return `/admin/products/${entityId}/edit`;
  if (entityType === "Order") return `/admin/orders/${entityId}`;
  if (entityType === "SupportTicket") return `/admin/support/${entityId}`;
  if (entityType === "DeliverySupportTicket") return `/admin/delivery-support/${entityId}`;
  return null;
}

export function presentStaffActivity(log: StaffActivityLog): StaffFootprintPresentation | null {
  const before = record(log.beforeData);
  const after = record(log.afterData);
  const href = entityHref(log.entityType, log.entityId);

  switch (log.action) {
    case "PRODUCT_CREATE": {
      const name = text(after, "nameEn");
      return {
        filterKey: "PRODUCT_CREATE",
        label: "Product added",
        description: name ? `Added “${name}” to the catalog.` : "Added a product to the catalog.",
        details: [text(after, "sku") ? `SKU: ${text(after, "sku")}` : null, text(after, "price") ? `Price: ${text(after, "price")} JD` : null].filter(Boolean) as string[],
        href,
      };
    }
    case "PRODUCT_UPDATE":
      return {
        filterKey: "PRODUCT_UPDATE",
        label: "Product edited",
        description: "Changed product information.",
        details: [
          changed("Price", before, after, "price"),
          changed("Stock", before, after, "stock"),
          changed("Availability", before, after, "isActive"),
        ].filter(Boolean) as string[],
        href,
      };
    case "PRODUCT_DELETE": {
      const name = text(before, "nameEn");
      return {
        filterKey: "PRODUCT_DELETE",
        label: "Product removed",
        description: name ? `Removed “${name}” from the storefront.` : "Removed a product from the storefront.",
        details: text(before, "sku") ? [`SKU: ${text(before, "sku")}`] : [],
        href,
      };
    }
    case "PRODUCT_KNOWLEDGE_CREATE":
      return { filterKey: log.action, label: "Product details added", description: "Added the “Know more about this product” content.", details: [], href: null };
    case "PRODUCT_KNOWLEDGE_UPDATE":
      return {
        filterKey: log.action,
        label: "Product details edited",
        description: "Changed the “Know more about this product” content.",
        details: bool(after, "isActive") !== null ? [`Visibility: ${bool(after, "isActive") ? "Visible" : "Hidden"}`] : [],
        href: null,
      };
    case "PRODUCT_KNOWLEDGE_DELETE":
      return { filterKey: log.action, label: "Product details removed", description: "Deleted the “Know more about this product” content.", details: [], href: null };
    case "BUNDLE_CREATE":
      return { filterKey: log.action, label: "Bundle added", description: `Added ${text(after, "nameEn") ? `“${text(after, "nameEn")}”` : "a bundle"}.`, details: [], href: null };
    case "BUNDLE_UPDATE":
      return { filterKey: log.action, label: "Bundle edited", description: "Changed a product bundle.", details: [], href: null };
    case "BUNDLE_DELETE":
      return { filterKey: log.action, label: "Bundle removed", description: "Removed a product bundle from the storefront.", details: [], href: null };
    case "BLOG_CREATE": {
      const title = text(after, "titleEn");
      return { filterKey: log.action, label: "Blog post added", description: title ? `Added “${title}”.` : "Added a blog post.", details: [], href: null };
    }
    case "BLOG_UPDATE": {
      const title = text(after, "titleEn") ?? text(before, "titleEn");
      return {
        filterKey: log.action,
        label: "Blog post edited",
        description: title ? `Changed “${title}”.` : "Changed a blog post.",
        details: bool(after, "isPublished") !== null ? [`Publication: ${bool(after, "isPublished") ? "Published" : "Draft"}`] : [],
        href: null,
      };
    }
    case "BLOG_DELETE": {
      const title = text(before, "titleEn");
      return { filterKey: log.action, label: "Blog post deleted", description: title ? `Deleted “${title}”.` : "Deleted a blog post.", details: [], href: null };
    }
    case "ORDER_STATUS_CHANGE":
      if (text(after, "status") !== "CANCELLED") return null;
      return {
        filterKey: "ORDER_CANCELLED",
        label: "Order cancelled",
        description: "Cancelled an order. Open it to review the reason and history.",
        details: text(after, "cancellationReason") ? [`Reason: ${text(after, "cancellationReason")}`] : [],
        href,
      };
    case "SUPPORT_TICKET_STATUS_UPDATE":
      if (!["RESOLVED", "CLOSED"].includes(text(after, "status") ?? "")) return null;
      return {
        filterKey: "SUPPORT_HANDLED",
        label: "Customer support handled",
        description: "Finished a customer support case. Open it to review the conversation.",
        details: [`Result: ${text(after, "status") === "CLOSED" ? "Closed" : "Resolved"}`],
        href,
      };
    case "DELIVERY_SUPPORT_TICKET_STATUS_UPDATE":
      if (!["RESOLVED", "CLOSED"].includes(text(after, "status") ?? "")) return null;
      return {
        filterKey: "DELIVERY_SUPPORT_HANDLED",
        label: "Delivery report handled",
        description: "Finished a delivery support report. Open it to review the work.",
        details: [
          `Result: ${text(after, "status") === "CLOSED" ? "Closed" : "Resolved"}`,
          text(after, "staffNote") ? `Staff note: ${text(after, "staffNote")}` : null,
        ].filter(Boolean) as string[],
        href,
      };
    case "DELIVERY_PASSWORD_RESET":
      return {
        filterKey: log.action,
        label: "Delivery password reset",
        description: "Reset a delivery worker’s password and ended their existing sessions.",
        details: text(before, "email") ? [`Account: ${text(before, "email")}`] : [],
        href: null,
      };
    default:
      return null;
  }
}
