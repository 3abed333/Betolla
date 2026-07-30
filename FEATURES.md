# Betolla Cosmetics — Complete Feature and System Reference

Last updated: 29 July 2026

This document describes the implemented Betolla application: storefront capabilities, customer and
pharmacy accounts, Admin/Staff/Delivery permissions, commerce workflows, database structure,
security controls, analytics, media handling, testing, and production architecture.

It describes the current codebase. `PROGRESS.md` contains implementation history and verification
records, while `README.md` contains setup and operating commands.

---

## 1. Platform summary

Betolla is a bilingual, mobile-first cosmetics e-commerce and operations platform built with:

- Next.js 16 App Router, React 19, and TypeScript;
- Tailwind CSS 4 and reusable Radix-based interface components;
- PostgreSQL with Prisma ORM and versioned migrations;
- server-rendered storefront and role-protected dashboards;
- English and Arabic localization with full RTL layout support;
- light, dark, and Betolla dark-gold themes;
- Cash on Delivery commerce;
- local/VPS media storage with image optimization;
- automated unit, integration, browser, authorization, checkout, upload, and monitoring tests.

The application has four authorization roles:

1. `CUSTOMER` — individual customers and pharmacy customers;
2. `STAFF` — store operations and customer/delivery support;
3. `DELIVERY` — delivery workers;
4. `ADMIN` — full business administration.

`PHARMACY` is a customer type, not an elevated role. Pharmacy accounts use the normal customer login
and receive customer permissions.

---

## 2. Public storefront

### Homepage

- Responsive banner carousel.
- Image, uploaded video, and YouTube banner media.
- Separate desktop/mobile media where configured.
- Configurable focal point, poster image, CTA, destination link, order, schedule, and auto-advance
  time.
- Banner impression/click analytics with visitor/date deduplication.
- Current default slider uses four supplied product images with crop-safe blurred backdrops and
  CTA links to the exact active product pages.
- Active product categories with images.
- Up to eight active products explicitly selected by Admin or Staff as homepage-featured products.
- Responsive two-column mobile product grid and larger desktop layouts.
- Customer-targeted popup campaigns.

### Store navigation

- Products, Bundles, Blog, Contact Us, account, orders, cart, language, and theme controls.
- Mobile hamburger keeps search and cart accessible in the header.
- English drawer opens beside the right-side hamburger.
- Arabic drawer opens beside the left-side hamburger.
- WhatsApp contact link uses the Admin-configured number.
- Instagram, Facebook, LinkedIn, FAQ, About Us, Privacy Policy, Blog, Products, Bundles, and Support
  links are available from the footer where configured.

### Product catalog

- Current supplied catalog: 67 products across six verified categories - Argan Hair Care, Beto
  Contact Lenses, Morphosis Professional, Plasma Hair Care, Professional Hair Proteins, and
  Electrical Styling Tools.
- Seventy-four optimized supplier images are stored locally; product and category links use the
  intended supplied assets.
- Products without a confirmed supplier price remain safely inactive instead of being published
  with an invented price.
- Browse active products.
- Search by product name/content.
- Filter by category.
- Bilingual product names and descriptions.
- Product image, regular price, compare-at/sale price, rating, review count, and stock state.
- Low-stock and out-of-stock presentation.

### Product detail

- Responsive main image and gallery.
- Bilingual name, category, description, price, sale state, and stock guidance.
- Quantity selection.
- Add to cart.
- Buy Now/direct checkout path through the cart/checkout flow.
- Wishlist toggle for signed-in customers.
- Published review list and aggregate rating.
- Optional “Know more about this product” page.
- Every supplied product has Admin/Staff-controlled bilingual rich HTML covering its available
  description, category-specific important facts, and safe use/care guidance.
- Rich HTML is sanitized before storage/rendering.

### Product bundles

- Bundle listing and detail pages.
- Bilingual bundle name and description.
- Bundle contents and quantities.
- Bundle price and component-value comparison.
- Add bundle to cart.
- Stock validation includes every component product.

### Blog and informational content

- Public blog listing and individual articles.
- Bilingual rich HTML blog content.
- Public FAQ page.
- Public Privacy Policy.
- Public About Us and contact section.
- Rich content is sanitized to remove scripts, event handlers, unsafe links, forms, and unsafe
  embeds.

---

## 3. Authentication and account types

### Individual registration

- First name.
- Last name.
- Email.
- Username.
- Password.
- Mandatory Privacy Policy consent.

### Pharmacy registration

- Pharmacy name.
- Email.
- Pharmacy location.
- Password.
- Mandatory Privacy Policy consent.
- Uses the standard login flow after registration.
- Stored as `CUSTOMER` with `customerType = PHARMACY`.

### Registration experience

- English and Arabic validation messages.
- Privacy Policy link opens the policy without intentionally clearing completed registration fields
  when the customer returns.
- Duplicate email/username responses do not reveal unnecessary account details.
- Guest theme and language preferences carry into the new account.
- Registration is rate-limited.

### Login and password handling

- One email/password login screen for all roles.
- Successful login redirects to the correct dashboard for the current role.
- Passwords are hashed with bcrypt and are never stored in plain text.
- Login attempts are rate-limited.
- Managed Staff and Delivery accounts receive a generated temporary password.
- First login can require an immediate password change.
- Admin/Staff can reset the password of accounts they are authorized to manage.
- Deactivated accounts cannot authenticate.
- No Google/social login is currently implemented.

### Session management

- Signed JWT session token stored in an HTTP-only cookie.
- Secure cookie in production and SameSite protection.
- Every authenticated request rechecks the corresponding database session.
- Revoked, expired, deactivated, role-changed, or password-change-required sessions stop working.
- Customers can view active sessions.
- Customers can revoke individual sessions or other sessions.
- Deactivating a managed account revokes its active sessions.

---

## 4. Cart, checkout, and order processing

### Cart

- Persistent client cart.
- Products and bundles.
- Quantity increase/decrease.
- Remove item.
- Live subtotal.
- Stock bounds.
- Cart count in the header.
- Abandoned-cart tracking for signed-in customers.

### Checkout

- Authentication required; guest checkout is not implemented.
- Saved-address selection.
- Create a complete delivery address during checkout.
- Jordanian phone normalization and validation.
- Governorate/city, area, street, building, floor, apartment, landmark, recipient, phone, and delivery
  notes where applicable.
- Text-address entry only; the previous map/pin feature was intentionally removed.
- City-based shipping fee.
- Promo-code validation and discount preview.
- Loyalty-point redemption.
- Store-credit redemption.
- Optional gift-order presentation with occasion, recipient name, and a personal message.
- Gift checkout uses a responsive celebratory card with decorative accents and supports Birthday,
  Love, Celebration, Thank You, and Other occasions.
- Final subtotal, discount, shipping, store credit, loyalty value, and order total.
- Cash on Delivery only.
- Visa/card payment is not present.
- Idempotency key prevents duplicate orders from double clicks or retries.

### Inventory and concurrency

- Direct products reserve their requested quantity.
- Bundles reserve the correct quantity of each component.
- Checkout uses serializable database transactions.
- Conditional stock updates protect the last item from concurrent overselling.
- Immutable inventory-reservation records preserve exactly what must be restored later.
- Order cancellation restores the original reserved product quantities.
- Return/refund and stock operations use guarded transactions.

### Order lifecycle

- `PENDING`
- `CONFIRMED`
- `ON_DELIVERY`
- `DELIVERED`
- `CANCELLED`

Features include:

- customer-visible status history;
- customer cancellation while the order is still eligible;
- confirmation dialog before customer cancellation;
- Admin/Staff status updates;
- delivery-driver assignment;
- no-driver operational alerts;
- synchronized terminal states between Admin/Staff and Delivery screens;
- delivery status history;
- customer order confirmation page;
- gift badge and gift details on confirmation and customer order detail;
- full order history and order detail;
- one-click reorder when products remain available;
- historical snapshots for item name, image, price, address, phone, notes, and payment label;
- CSV order export for Admin.

### Cash on Delivery completion

When delivery completes:

- the order becomes delivered;
- COD payment becomes paid;
- driver assignment becomes delivered;
- loyalty points are earned;
- customer lifetime statistics are updated;
- the completed COD amount appears in delivery collections.

---

## 5. Customer and pharmacy account area

Individual and pharmacy customers share the following customer tools.

### Overview

- Account summary.
- Recent order information.
- Wallet and loyalty balances.
- Quick navigation to customer functions.

### Orders

- Order history.
- Order detail and status timeline.
- Cancellation when allowed.
- Reorder.
- Return request creation.
- Review creation for eligible delivered items.
- Delivery/driver rating.

### Addresses

- Add, edit, delete, and view saved addresses.
- Default shipping address.
- Recipient and delivery instructions.
- Jordan-oriented city and phone validation.
- No map or geolocation dependency.

### Wallet and loyalty

- Loyalty-points balance.
- Store-credit balance.
- Loyalty tier and progress.
- Loyalty transaction history.
- Store-credit transaction history.
- Configurable points-per-JD and redemption value.

### Wishlists

- Multiple named wishlists.
- Add/remove products.
- Price-at-add snapshot.
- Price-drop preference.
- Restock preference.

### Preferences

- English/Arabic language.
- Light/gold-dark/dark/system theme preference.
- Notification category/channel preferences.
- Email, Push, and In-App options.
- SMS is intentionally absent from the customer interface and rejected by the API.

### Notifications

- In-app notification inbox.
- Unread counter and `9+` display.
- Category filtering.
- Mark one as read.
- Mark all as read.
- Logical-event deduplication prevents duplicate visible notifications.

### Support

- Create general or order-related support tickets.
- View ticket status.
- Exchange messages with Staff/Admin.
- Customer-visible replies separated from internal operational notes.

### Sessions

- View active devices/sessions.
- Revoke sessions securely.

---

## 6. Admin dashboard

Admin pages and APIs require the `ADMIN` role.

### Dashboard overview

- Pending orders.
- Low/out-of-stock products.
- Open customer-support tickets.
- Open delivery-support reports.
- Orders needing a delivery worker.
- Revenue.
- Customer count.
- Links from operational KPIs to the relevant management page.

### Orders

- Search and filter.
- Order detail and complete financial breakdown.
- Status changes and cancellation.
- Delivery-worker assignment.
- Missing-driver warnings.
- Customer/address/order snapshots.
- Gift badge in the order list and full gift occasion/recipient/message on order detail.
- CSV export.

### Products

- Create, edit, deactivate, and manage products.
- Product and gallery image upload.
- SKU, names, descriptions, category, prices, stock, and low-stock threshold.
- Active storefront visibility.
- Direct Homepage Featured switch from the product table.
- Homepage-featured option in create/edit forms.
- Product “Know more” bilingual sanitized HTML.
- Staff-footprint audit recording of meaningful product changes.

### Bundles

- Create/edit/deactivate bundles.
- Select component products and quantities.
- Set bilingual content, image, price, and status.
- Compare bundle price with component total.

### Homepage banners

- Multiple carousel entries.
- Uploaded image or video.
- YouTube link support.
- Desktop/mobile media and poster.
- Bilingual title/subtitle/CTA.
- Destination URL.
- Focal point.
- Sort order.
- start/end schedule.
- auto-advance timing.
- activate/deactivate/delete.
- image/video guidance in the interface.

### Blog management

- Create, edit, publish/unpublish, and delete articles.
- Bilingual title, summary, slug/content.
- Sanitized rich HTML.
- Admin and Staff author attribution.

### Site content

- WhatsApp number.
- Instagram URL.
- Facebook URL.
- LinkedIn URL.
- Privacy Policy content.
- About Us content.
- FAQ create/edit/order/activate/delete.
- Sanitized bilingual rich HTML.

### Popup campaign center

- Multiple independent campaigns.
- Create, edit, activate/deactivate, schedule, and permanently delete.
- Ten templates:
  - Sale;
  - Announcement;
  - New Product;
  - Welcome;
  - Limited Time;
  - Free Shipping;
  - Loyalty Reward;
  - Back in Stock;
  - Event;
  - Custom.
- Bilingual campaign name, title, announcement line, body HTML, CTA, and destination.
- Optional optimized image with 16:9 / 1200×675 guidance.
- Live preview.
- Appearance triggers:
  - any storefront page;
  - homepage;
  - products;
  - product detail;
  - cart;
  - checkout;
  - blog;
  - bundles.
- Audience types:
  - everyone;
  - individual customers;
  - pharmacies.
- Customer filters:
  - all;
  - top 30% by lifetime spending;
  - bottom 30% by lifetime spending;
  - new customers;
  - inactive customers.
- Server-side eligibility prevents disclosure of campaigns to the wrong audience.

### Staff management

- Create Staff accounts.
- Generated temporary password shown once.
- View/edit profile fields.
- Activate/deactivate/reactivate.
- Reset password.
- Permanent deletion only when the account has no operational history.
- Accounts with history must be deactivated to preserve audit integrity.
- Session revocation on deactivation.

### Staff footprint

- Admin-only staff cards.
- Last-month default range.
- Date and meaningful-action filters.
- Plain-language action descriptions.
- Per-staff activity timeline.
- Product, blog, order deletion, support resolution, account, content, and other important operational
  actions.
- Before/after audit data where applicable.
- Routine technical noise is hidden from the default review experience.

### Customers

- Searchable customer list.
- Individual/pharmacy identity.
- Customer profile and order history.
- Spend, order count, loyalty, store credit, addresses, and status.
- Store-credit adjustments with immutable transaction ledger.
- Customer CSV export.

### Promo codes

- Percentage or fixed discount.
- Date range.
- minimum spend.
- total and per-customer usage limits.
- active status.
- customer segment targeting.
- usage and discount analytics.

### Abandoned carts

- View recoverable carts.
- Customer/cart value information.
- Send in-app reminder.
- Conversion funnel analytics.

### Customer support

- Filter/view tickets.
- Assign to Admin/Staff.
- Update status.
- Reply to customer.
- Add internal notes.
- Review handled/resolved work through staff footprint.

### Delivery support

- View driver-submitted incident reports.
- Urgency and problem type.
- Private supporting photo.
- Assign to Admin/Staff.
- Status updates and staff notes.

### Returns

- View requested products, quantities, reasons, and calculated value.
- Approve or reject.
- Mark received.
- Issue refund.
- Store-credit refund support.
- Status history and serializable financial updates.

### Review moderation

- Pending/published status.
- Filter by one-to-five stars.
- Filter by moderation status.
- Approve/publish.
- Hide/unpublish.
- Reject/delete.
- Rating aggregates are recalculated from published reviews only.

### Settings

- Loyalty points earned per JD.
- Loyalty redemption value.
- Bilingual loyalty tiers and thresholds.
- Shipping cities/zones.
- Shipping fee and delivery estimate.
- Activate/deactivate shipping zones.

### Admin notifications

- Admin-specific operational notification inbox.
- Categories, unread count, mark-read controls, and logical-event deduplication.

---

## 7. Staff dashboard

Staff pages and APIs require the `STAFF` role.

Staff can:

- view operational dashboard KPIs;
- manage orders and assignment workflow;
- create/edit/deactivate products;
- choose homepage-featured products;
- manage product knowledge content;
- create/edit/delete blog posts;
- create and manage Delivery accounts;
- reset Delivery passwords;
- permanently delete Delivery accounts only when they have no operational history;
- deactivate/reactivate Delivery accounts with history;
- handle customer-support tickets;
- handle delivery-support reports;
- view their operational notifications.

Staff cannot:

- access the Admin dashboard;
- manage Admin/Staff accounts;
- inspect Staff Footprint;
- manage customers or store credit;
- manage promo codes;
- manage bundles, banners, site settings, popup campaigns, loyalty settings, shipping settings,
  returns, review moderation, or Admin analytics unless a separately protected API explicitly grants
  the action.

---

## 8. Delivery dashboard

Delivery pages and APIs require the `DELIVERY` role.

### Active deliveries

- Only assignments belonging to the signed-in delivery worker.
- Order number and assigned status.
- Full textual delivery address.
- Recipient name and visible recipient phone.
- Delivery notes.
- Copy address and copy phone controls.
- Product/item list.
- COD/payment information.
- Picked Up, En Route, Delivered, or Failed workflow.
- Terminal orders automatically display their final state rather than stale action buttons.

### History

- Completed and failed assignments.
- Order/date information.

### Collections

- Cash collected from completed COD deliveries.
- Collection totals separated from driver earnings.

### Delivery reports

- Report delivery problems.
- Problem categories and urgency.
- Notes and optional private photo.
- View report status and Staff/Admin response.

### Notifications

- Assignment and operational notifications scoped to the signed-in delivery worker.

Delivery workers cannot access another worker’s assignments or reports.

---

## 9. Permission matrix

| Capability | Visitor | Customer / Pharmacy | Staff | Delivery | Admin |
|---|---:|---:|---:|---:|---:|
| Browse storefront/products/bundles/blog | Yes | Yes | Yes | Yes | Yes |
| Use cart | Yes | Yes | Yes | Yes | Yes |
| Complete checkout | No | Yes | No | No | No |
| Customer account/orders/wallet/wishlist | No | Own only | No | No | No |
| Create support ticket | No | Own only | No | No | No |
| Handle customer support | No | No | Yes | No | Yes |
| Manage orders | No | Own view/actions | Yes | Assigned status only | Yes |
| Manage products | No | No | Yes | No | Yes |
| Select homepage products | No | No | Yes | No | Yes |
| Manage blog | No | No | Yes | No | Yes |
| Manage bundles/banners/popups/site content | No | No | No | No | Yes |
| Manage Staff accounts | No | No | No | No | Yes |
| Manage Delivery accounts | No | No | Yes | No | No |
| Staff Footprint | No | No | No | No | Yes |
| Customer/store-credit administration | No | No | No | No | Yes |
| Promo codes/settings/analytics | No | No | No | No | Yes |
| Delivery assignments | No | No | Assign/manage | Own only | Assign/manage |
| Delivery reports | No | No | Handle | Own only | Handle |
| Returns/review moderation | No | Submit own | No | No | Yes |

Page guards, API guards, and object-ownership checks enforce these permissions on the server. Hiding a
button is never the only authorization control.

---

## 10. Notifications

Notification categories include:

- order updates;
- promotions;
- back in stock;
- loyalty and wallet;
- support;
- delivery assignments;
- operations.

Channels represented in the system:

- `IN_APP` — fully displayed and managed in the application;
- `EMAIL` — preference and simulated delivery record only;
- `PUSH` — preference and simulated delivery record only;
- `SMS` — legacy enum/data compatibility only; unavailable in the current UI/API.

No external email, SMS, or web-push provider is currently connected. Push means a browser/device
notification when a real push provider and permission flow are added; today it is a preference and
simulated record, not an actual phone notification.

Notification events have stable event keys so retries or multi-channel delivery do not create
duplicate in-app rows.

---

## 11. Analytics and business intelligence

Admin analytics supports a selected date range and comparison with the immediately preceding period.

Available analysis includes:

- total and net recognized revenue;
- revenue over time;
- registered/signed-in customer and ordering conversion indicators;
- order/customer/business overview;
- product performance;
- banner impressions, clicks, and click-through rate;
- top customers by lifetime value;
- RFM customer segmentation:
  - Champions;
  - Loyal;
  - Potential Loyalist;
  - New Customer;
  - At Risk;
  - Needs Attention;
  - Lost;
- on-demand RFM recalculation;
- frequently bought-together product pairs;
- day/time sales heatmap;
- staff performance and drill-down;
- delivery completion, failure, timing, reasons, and ratings;
- cohort retention;
- cart-abandonment funnel and recoverable value;
- geographic order distribution by city;
- open delivery-report and at-risk/lost-customer KPIs.

The dashboard reports net revenue, not accounting profit, because product cost/COGS is not stored.

---

## 12. Database architecture

### Environments

- Local development uses project-managed embedded PostgreSQL on port 5433.
- Production uses PostgreSQL installed on the Ubuntu server and bound to localhost.
- The production database is not stored in GitHub and is not downloaded into the browser.
- Prisma migrations evolve the schema; production uses `prisma migrate deploy`.
- `prisma migrate reset` and the large development seed must never be run against production.
- Current schema history contains 18 additive migrations.

### Identity and access models

- `User`
- `Session`
- `RateLimitBucket`
- `UploadQuota`

### Customer/profile models

- `Address`
- `PaymentMethod`
- `CustomerStats`

### Catalog and content models

- `Category`
- `Product`
- `ProductImage`
- `ProductKnowledge`
- `ProductBundle`
- `ProductBundleItem`
- `Banner`
- `BannerEvent`
- `BlogPost`
- `Faq`
- `StaticPage`
- `SiteSettings`
- `PopupCampaign`

### Commerce models

- `Cart`
- `CartItem`
- `Order`
- `OrderItem`
- `OrderInventoryReservation`
- `OrderStatusHistory`
- `PromoCode`
- `PromoCodeUsage`
- `ShippingZone`

### Loyalty and engagement models

- `Wishlist`
- `WishlistItem`
- `Review`
- `LoyaltyConfig`
- `LoyaltyTier`
- `LoyaltyTransaction`
- `StoreCreditTransaction`

### Support, returns, delivery, and audit models

- `SupportTicket`
- `SupportTicketMessage`
- `ReturnRequest`
- `ReturnRequestItem`
- `ReturnStatusHistory`
- `DeliveryAssignment`
- `DeliverySupportTicket`
- `ActivityLog`

### Notification models

- `NotificationPreference`
- `Notification`

### Data-integrity design

- Unique emails, usernames, SKUs, slugs, order numbers, checkout keys, and appropriate event keys.
- Foreign keys with deliberate `Cascade`, `Restrict`, and `SetNull` behavior.
- Historical orders use snapshots rather than mutable live product/address values.
- Financial values use database decimal types.
- Indexes cover important ownership, status, date, category, and featured-product queries.
- Serializable transactions protect checkout, assignment, returns, reviews, cancellation, and
  financial updates.

---

## 13. Security controls

### Authentication and authorization

- bcrypt password hashing.
- Signed JWT session tokens.
- HTTP-only, secure-in-production, SameSite cookies.
- Database-backed sessions with expiry/revocation.
- Role verification in page layouts and API handlers.
- Object-level ownership checks for orders, addresses, tickets, wishlists, sessions, assignments,
  reports, and uploads.
- Deactivation invalidates active sessions.
- Temporary-password change enforcement for managed accounts.

### Abuse prevention

- Database-backed rate limits shared across application processes.
- Login, registration, password change, upload, and sensitive workflows are bounded.
- `Retry-After` responses for rate-limited requests.
- Proxy-aware client IP handling in production.
- Checkout idempotency prevents duplicate order creation.

### Input and content safety

- Zod validation for API payloads.
- Prisma parameterization instead of hand-built SQL for application queries.
- Rich HTML sanitization.
- Generic account-conflict responses.
- Bounded strings, quantities, money, dates, file counts, and file sizes.
- Jordanian phone normalization.
- Promo, loyalty, refund, inventory, and state-transition validation.

### Browser and HTTP protections

- Content Security Policy.
- `frame-ancestors 'none'` and `X-Frame-Options: DENY`.
- `X-Content-Type-Options: nosniff`.
- strict referrer policy.
- restrictive camera/microphone/payment permissions.
- HSTS in HTTPS production.
- production HTTPS upgrade.
- request IDs on monitored endpoints.
- no-store health responses.

### Auditability

- Important Admin/Staff actions recorded in `ActivityLog`.
- Staff Footprint translates important actions into an Admin-readable timeline.
- Order, return, and delivery status histories are retained.
- Store-credit and loyalty movements use transaction ledgers.

---

## 14. Uploads and media

### Images

- JPEG/PNG/WebP input validation.
- Real image decoding with Sharp.
- pixel-count limits.
- resize to a maximum dimension.
- conversion to optimized WebP.
- randomized filenames.
- per-account daily upload quotas.
- public folders restricted to approved media categories.
- path traversal and unsupported extension rejection.

Public media categories:

- products;
- avatars;
- reviews;
- banners;
- popups.

### Banner videos

- MP4 and WebM.
- file-signature validation.
- count/size controls.
- randomized filenames.
- orphan cleanup support.

### Private delivery evidence

- Delivery-report photos are stored outside `public/`.
- Served only through an authenticated, authorized API route.
- Not available as guessable public static files.

### Production storage

- Current production media lives on the Ubuntu server filesystem.
- `public/uploads` and `uploads-private` must be preserved across releases and included in backups.
- A future multi-server/ephemeral deployment should replace the storage adapter with S3-compatible
  object storage or a managed media service.

---

## 15. Internationalization, mobile, and accessibility

- English and Arabic translations.
- Full document direction switching.
- Logical CSS edges for RTL/LTR.
- Localized names, descriptions, prices, dates, statuses, dashboards, and validation.
- Language and theme persisted for guests and accounts.
- Responsive storefront, cart, checkout, account, Admin, Staff, and Delivery layouts.
- Mobile-first customer journeys.
- Touch-friendly navigation and swipeable drawers with animated overlay and directional
  open/close motion.
- Drawer edge follows the hamburger position.
- Accessible dialog titles, labels, controls, focus restoration, and keyboard paths.
- Mobile tables are contained without document-level horizontal overflow.

---

## 16. Operations and deployment

Current production architecture:

- Ubuntu server;
- Nginx reverse proxy;
- Next.js production service managed by systemd;
- Next.js listens on `127.0.0.1:3000`;
- PostgreSQL listens on localhost only;
- Cloudflare in front of the public domain;
- HTTPS;
- UFW permits SSH, HTTP, and HTTPS while denying other inbound traffic;
- secrets stored in server `.env`, not GitHub;
- `/api/health` verifies application and database reachability;
- structured server logs;
- database migration during deployment;
- application and database rollback backups retained during releases.

Deployment preserves:

- production `.env`;
- PostgreSQL data;
- public uploads;
- private uploads;
- previous application release;
- pre-migration database dump.

Operational responsibilities still required for ongoing production:

- scheduled automatic database backups;
- off-server backup copies;
- periodic restore testing;
- uptime/error/resource monitoring;
- disk-space alerts;
- dependency review and controlled upgrades;
- recurring security and penetration testing.

---

## 17. Automated quality assurance

The repository includes:

- TypeScript compile checks;
- ESLint;
- production Next.js build validation;
- unit/integration tests for:
  - checkout rules;
  - Cash on Delivery restriction;
  - inventory demand;
  - revenue recognition;
  - registration/customer types;
  - privacy consent;
  - notification deduplication;
  - notification preferences;
  - HTML sanitization;
  - popup triggers and audiences;
  - YouTube banners;
  - staff-footprint filtering;
  - review moderation and rating aggregation;
  - address and phone validation;
  - support tickets;
  - returns;
- Playwright browser tests for:
  - registration/login/logout;
  - role authorization;
  - checkout;
  - order cancellation;
  - uploads;
  - health/monitoring;
  - desktop/mobile behavior.

The latest recorded local verification is:

- 18 migrations current;
- lint clean;
- TypeScript clean;
- 29/29 unit/integration tests passed;
- production build passed;
- 23/23 browser tests passed, including persisted gift checkout on desktop and mobile;
- focused live mobile verification passed for the latest featured-product and drawer changes.

---

## 18. Explicitly not implemented

To avoid confusing planned ideas with working features:

- No Visa, Mastercard, or online card gateway.
- No guest checkout.
- No Google/social sign-in.
- No SMS sending.
- No real email provider.
- No real browser/mobile push provider.
- No customer-address map or delivery map.
- No GPS delivery tracking.
- No native Android/iOS application.
- No multi-currency checkout; prices are Jordanian dinars.
- No product cost/COGS accounting, so analytics cannot calculate true gross profit.
- No cloud object storage in the current single-server deployment.

These can be added later without changing the current role and database foundations, but they should
not be presented as completed capabilities today.
