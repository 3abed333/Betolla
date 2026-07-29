import assert from "node:assert/strict";
import test from "node:test";
import { registerSchema } from "../src/lib/validation/auth";
import { updateNotificationPreferenceSchema } from "../src/lib/validation/notificationPreferences";
import { blogPostSchema, popupCampaignSchema } from "../src/lib/validation/content";
import { sanitizeRichHtml } from "../src/lib/server/sanitizeHtml";
import { bannerSchema } from "../src/lib/validation/banner";
import { getYouTubeEmbedUrl, getYouTubeVideoId, normalizeYouTubeUrl } from "../src/lib/youtube";
import { presentStaffActivity } from "../src/lib/staffFootprint";
import { popupMatchesPath } from "../src/lib/popupCampaigns";
import { popupAudienceMatches, type PopupAudienceCustomer } from "../src/lib/popupAudience";

test("individual registration requires names, username, and privacy consent", () => {
  const missingConsent = registerSchema.safeParse({
    customerType: "INDIVIDUAL",
    firstName: "A",
    lastName: "Customer",
    email: "customer@example.com",
    username: "customer",
    password: "password123",
    privacyAccepted: false,
  });
  assert.equal(missingConsent.success, false);

  const missingUsername = registerSchema.safeParse({
    customerType: "INDIVIDUAL",
    firstName: "A",
    lastName: "Customer",
    email: "customer@example.com",
    password: "password123",
    privacyAccepted: true,
  });
  assert.equal(missingUsername.success, false);
});

test("pharmacy registration accepts the pharmacy-specific profile without a public username", () => {
  const result = registerSchema.safeParse({
    customerType: "PHARMACY",
    email: "orders@pharmacy.example",
    pharmacyName: "Amman Care Pharmacy",
    pharmacyLocation: "Amman, Jordan",
    password: "password123",
    privacyAccepted: true,
  });
  assert.equal(result.success, true);
});

test("SMS can no longer be selected as a notification preference", () => {
  assert.equal(updateNotificationPreferenceSchema.safeParse({
    category: "ORDER_UPDATES",
    channel: "SMS",
    enabled: true,
  }).success, false);
  assert.equal(updateNotificationPreferenceSchema.safeParse({
    category: "ORDER_UPDATES",
    channel: "PUSH",
    enabled: true,
  }).success, true);
});

test("rich content sanitizer removes scripts, event handlers, and javascript URLs", () => {
  const sanitized = sanitizeRichHtml(
    '<h2>Safe</h2><script>alert(1)</script><img src=x onerror=alert(2)><a href="javascript:alert(3)">bad</a><a href="https://example.com" target="_blank">safe</a>',
  );
  assert.match(sanitized, /<h2>Safe<\/h2>/);
  assert.doesNotMatch(sanitized, /script|onerror|javascript:/i);
  assert.match(sanitized, /rel="noopener noreferrer"/);
});

test("content validation bounds HTML and requires popup end after start", () => {
  assert.equal(blogPostSchema.safeParse({
    titleEn: "English",
    titleAr: "عربي",
    contentHtmlEn: "<p>Body</p>",
    contentHtmlAr: "<p>المحتوى</p>",
    isPublished: true,
  }).success, true);

  assert.equal(popupCampaignSchema.safeParse({
    name: "Timed sale",
    template: "SALE",
    trigger: "CART",
    audienceType: "EVERYONE",
    customerSegment: "ALL",
    imageUrl: "/uploads/popups/sale.webp",
    titleEn: "Sale",
    titleAr: "تخفيض",
    bodyHtmlEn: "<p>Sale</p>",
    bodyHtmlAr: "<p>تخفيض</p>",
    startsAt: "2026-07-29T10:00:00.000Z",
    endsAt: "2026-07-28T10:00:00.000Z",
  }).success, false);
});

test("popup triggers match only the intended storefront pages", () => {
  assert.equal(popupMatchesPath("ANY_STOREFRONT_PAGE", "/cart"), true);
  assert.equal(popupMatchesPath("HOME_PAGE", "/"), true);
  assert.equal(popupMatchesPath("HOME_PAGE", "/products"), false);
  assert.equal(popupMatchesPath("PRODUCTS", "/products"), true);
  assert.equal(popupMatchesPath("PRODUCTS", "/products/serum"), false);
  assert.equal(popupMatchesPath("PRODUCT_DETAIL", "/products/serum"), true);
  assert.equal(popupMatchesPath("PRODUCT_DETAIL", "/products/serum/learn"), true);
  assert.equal(popupMatchesPath("CART", "/cart"), true);
  assert.equal(popupMatchesPath("CART", "/checkout"), false);
  assert.equal(popupMatchesPath("CHECKOUT", "/checkout"), true);
  assert.equal(popupMatchesPath("BLOG", "/blog/how-to-cleanse"), true);
  assert.equal(popupMatchesPath("BUNDLES", "/bundles/skincare-set"), true);
});

test("popup validation accepts images and rejects unsupported appearance triggers", () => {
  const base = {
    name: "Cart offer",
    template: "SALE",
    trigger: "CART",
    audienceType: "INDIVIDUAL_CUSTOMERS",
    customerSegment: "TOP_30",
    imageUrl: "/uploads/popups/cart-offer.webp",
    titleEn: "Complete your order",
    titleAr: "أكملي طلبك",
    bodyHtmlEn: "<p>Use your offer before checkout.</p>",
    bodyHtmlAr: "<p>استخدمي عرضك قبل إتمام الطلب.</p>",
  };
  assert.equal(popupCampaignSchema.safeParse(base).success, true);
  assert.equal(popupCampaignSchema.safeParse({ ...base, trigger: "ADMIN_DASHBOARD" }).success, false);
});

test("popup audience targeting handles account types and customer segments", () => {
  const now = new Date("2026-07-29T12:00:00.000Z");
  const population: PopupAudienceCustomer[] = [
    { userId: "low", customerType: "INDIVIDUAL", createdAt: new Date("2025-01-01"), lastOrderAt: new Date("2025-01-01"), totalSpent: 5 },
    { userId: "middle", customerType: "INDIVIDUAL", createdAt: new Date("2025-01-01"), lastOrderAt: now, totalSpent: 50 },
    { userId: "top", customerType: "INDIVIDUAL", createdAt: new Date("2025-01-01"), lastOrderAt: now, totalSpent: 500 },
    { userId: "pharmacy", customerType: "PHARMACY", createdAt: new Date("2026-07-20"), lastOrderAt: null, totalSpent: 100 },
  ];

  assert.equal(popupAudienceMatches("EVERYONE", "ALL", null, population, now), true);
  assert.equal(popupAudienceMatches("PHARMACIES", "ALL", null, population, now), false);
  assert.equal(popupAudienceMatches("PHARMACIES", "ALL", population[3], population, now), true);
  assert.equal(popupAudienceMatches("INDIVIDUAL_CUSTOMERS", "TOP_30", population[2], population, now), true);
  assert.equal(popupAudienceMatches("INDIVIDUAL_CUSTOMERS", "BOTTOM_30", population[0], population, now), true);
  assert.equal(popupAudienceMatches("EVERYONE", "NEW_CUSTOMERS", population[3], population, now), true);
  assert.equal(popupAudienceMatches("EVERYONE", "INACTIVE_CUSTOMERS", population[0], population, now), true);
  assert.equal(popupAudienceMatches("EVERYONE", "INACTIVE_CUSTOMERS", population[3], population, now), false);
});

test("YouTube banners accept only supported HTTPS YouTube links and normalize them", () => {
  assert.equal(getYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(normalizeYouTubeUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.match(getYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")!, /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
  assert.equal(getYouTubeVideoId("https://evil.example/watch?v=dQw4w9WgXcQ"), null);

  const common = {
    mediaType: "YOUTUBE",
    desktopMediaUrl: "https://youtu.be/dQw4w9WgXcQ",
    titleEn: "Video banner",
    titleAr: "لافتة فيديو",
    focalPointX: 50,
    focalPointY: 50,
    sortOrder: 0,
    autoAdvanceSeconds: 6,
    isActive: true,
  };
  assert.equal(bannerSchema.safeParse(common).success, true);
  assert.equal(bannerSchema.safeParse({ ...common, desktopMediaUrl: "https://example.com/video" }).success, false);
});

test("staff footprint hides routine updates and presents important work in plain language", () => {
  assert.equal(presentStaffActivity({
    action: "DELIVERY_ASSIGNED",
    entityType: "Order",
    entityId: "order-1",
    beforeData: null,
    afterData: { driverId: "driver-1" },
  }), null);
  assert.equal(presentStaffActivity({
    action: "ORDER_STATUS_CHANGE",
    entityType: "Order",
    entityId: "order-1",
    beforeData: null,
    afterData: { status: "DELIVERED" },
  }), null);
  assert.equal(presentStaffActivity({
    action: "ORDER_STATUS_CHANGE",
    entityType: "Order",
    entityId: "order-1",
    beforeData: null,
    afterData: { status: "CANCELLED", cancellationReason: "Duplicate order" },
  })?.label, "Order cancelled");
  assert.equal(presentStaffActivity({
    action: "SUPPORT_TICKET_STATUS_UPDATE",
    entityType: "SupportTicket",
    entityId: "ticket-1",
    beforeData: { status: "IN_PROGRESS" },
    afterData: { status: "CLOSED" },
  })?.label, "Customer support handled");
});
