# Betolla Cosmetics — Feature Guide

A plain-language catalog of everything the app does, organized by who uses it. For technical
implementation detail, build history, and known issues, see `PROGRESS.md`.

Betolla Cosmetics is a bilingual (English/Arabic, full RTL support) e-commerce platform for a
cosmetics brand. One shared login screen serves four roles, each redirected to its own dashboard:
**Customer** (storefront + account hub), **Staff** (day-to-day operations), **Delivery** (drivers),
and **Admin** (full control). Every role can switch language and light/dark theme independently of
what's being described below.

---

## 1. Storefront (no login required)

### Browsing & search
Customers can browse the full product catalog, filter by category (Lipstick, Foundation, Skincare
Serums, Perfume, Eyeshadow & Blush, Cleansers & Toners), and search by name. Listings show price,
sale price when discounted, star rating, and review count at a glance.

### Product detail pages
Each product has a full detail page: an image gallery, bilingual name/description, price (with a
strikethrough "was" price when on sale), quantity selector, "Add to Cart" and "Buy Now" buttons, an
"Add to wishlist" toggle, and the full list of customer reviews (star rating + written comment,
optionally with a photo).

### Bundles
Curated multi-product sets sold at a bundled price, with their own listing and detail pages showing
which individual products are included and the combined savings versus buying separately.

### Cart
A running cart (persisted locally so it survives a page reload) showing each line item, quantity
controls, and a subtotal. Shipping and any promo-code discount are calculated at checkout, not here.

### Checkout
- **Shipping address**: pick a saved address or add a new one inline (with city/area/street fields).
- **Payment method**: Cash on Delivery or a mock card payment (no real payment gateway is wired up —
  this is a demo/simulated checkout).
- **Promo codes**: enter a code to apply a discount; the order summary shows an explicit
  **"Discount: -X.XX JD"** line between Subtotal and Shipping so the customer can see exactly how
  much they saved, not just a lower total.
- **Store credit & loyalty points**: customers can apply their store-credit balance and redeem
  loyalty points toward the order total, with a live preview of the redemption value.
- **Order confirmation page**: after placing an order, a confirmation screen shows the full
  Subtotal → Discount → Shipping → Total breakdown and links to track the order or keep shopping.

---

## 2. Authentication

- **Register / Login**: customers self-register; a single login screen serves all four roles and
  redirects each to the correct dashboard after sign-in.
- **Change password**, **session management** (see an account's active login sessions and revoke
  any of them individually), and **login rate-limiting** (repeated failed attempts get temporarily
  blocked) to slow down brute-force guessing.
- No 2FA and no guest checkout — both deliberately out of scope for this build.

---

## 3. Customer Account Hub (`/account`)

- **Overview**: a quick snapshot of the account (recent activity, wallet balance, etc.).
- **Orders**: full order history with a visual status tracker (Placed → Confirmed → On Delivery →
  Delivered), a one-click **Reorder** button for past orders, per-item **return requests**, and the
  ability to **write a product review** or **rate the delivery/driver** once an order is delivered.
- **Wallet & Loyalty**: store-credit balance, loyalty-point balance, and progress toward the next
  loyalty tier (Bronze/Silver/Gold/Platinum), plus a transaction history explaining every credit or
  debit.
- **Addresses**: saved delivery addresses with a real interactive map (click to drop a pin) for
  precise location picking, not just a text address.
- **Wishlists**: save products for later; get notified if a wishlisted item drops in price or comes
  back in stock (based on notification preferences below).
- **Notification preferences**: a grid of toggles controlling which notification categories
  (order updates, promotions, back-in-stock, loyalty/wallet, support) are sent via which channel
  (email, SMS, push, in-app) — all simulated, nothing is actually emailed or texted.
- **Notifications inbox**: a running list of every notification sent to the account, with an
  **unread-count badge** on the nav link (capped at "9+"), category filter tabs (with their own
  per-category unread counts), and "mark as read" / "mark all as read" actions.
- **Support tickets**: open a support ticket by category, optionally tied to a specific order, and
  message back and forth with Staff/Admin until it's resolved.
- **Sessions**: view and revoke active login sessions from other devices/browsers.

---

## 4. Admin Dashboard (`/admin`)

Full control over the store. Exactly one Admin account exists, seeded at setup — Admin accounts are
never created through the UI.

- **Dashboard home**: KPI tiles — pending orders, low/out-of-stock product count, open support
  tickets, open delivery problem reports, **orders needing a driver assigned**, total revenue, and
  customer count — each linking straight to the relevant filtered list.
- **Orders**: full order list (filter by status, search by order number/customer) and a detail page
  per order showing the item list, price breakdown (with the discount line when a promo was used),
  status-advance/cancel actions, and driver assignment. Any order that's confirmed (or further along)
  with **no delivery driver assigned** shows a prominent red alert banner on the detail page and a
  matching "No driver" badge on the list row, so this can't be missed. CSV export of the order list.
- **Products**: full catalog CRUD (create/edit/deactivate), image upload with automatic resizing,
  stock tracking with a low-stock threshold.
- **Bundles**: create/edit multi-product bundles, pick which products are included, set the bundled
  price with a live "sum of components" comparison.
- **Staff management**: create/deactivate Staff accounts (temp password shown once), view each
  staff member's activity log.
- **Customers**: searchable/sortable customer list, a detail page per customer (spend, orders,
  loyalty tier, store credit, order history, addresses), and a manual store-credit adjustment tool
  (with a ledger entry for every adjustment).
- **Promo codes**: create discount codes (percentage or fixed amount), target them at a customer
  segment, set usage limits and expiry, and view real usage stats (how many times used, total
  discount given, by whom).
- **Abandoned carts**: see carts that were started but never checked out, with a one-click "Send
  Reminder" notification.
- **Support inbox**: view/filter every customer support ticket, reply, assign to a staff member, and
  add internal notes that are invisible to the customer.
- **Delivery support queue**: driver-filed problem reports (e.g. "customer not answering," "wrong
  address"), with urgency flags and staff notes.
- **Analytics** (`/admin/analytics`): a dense, dark-themed dashboard independent of the site's own
  light/dark toggle, covering:
  - A KPI strip (total revenue, at-risk+lost customers, open delivery reports, recoverable cart
    revenue) with period-over-period trend deltas.
  - **RFM customer segmentation** (Champions/Loyal/Potential Loyalist/New/Needs Attention/At
    Risk/Lost), recalculated on demand.
  - **Top customers by lifetime value** and **frequently bought together** product pairs.
  - **Sales heatmap** (order volume by day-of-week × time-of-day) and **cohort retention**
    (% of each signup-month cohort still ordering, month over month).
  - **Net Revenue Over Time**: a line chart of revenue after discounts and refunds, by day, over
    a selectable date range — deliberately labeled "net revenue," not "profit," since the app has
    no per-product cost data to compute a true profit figure.
  - **Staff performance** (orders processed per staff member, with a drill-down timeline) and
    **delivery performance** (on-time rate, failed-delivery rate/reasons, average delivery time,
    average customer rating per driver).
  - **Cart abandonment funnel** and **geographic order distribution** by shipping city.
  - A shared date-range filter applies across the range-aware widgets, with real recalculation
    (not just re-filtering a cached view).
- **Notifications inbox**: same unread-badge/category-filter inbox as the customer hub, scoped to
  the admin's own operational notifications (support tickets, "order confirmed without a driver,"
  etc.).
- **Settings**: loyalty program configuration (points earned per JD spent, redemption value per
  point), loyalty tier thresholds, and shipping-zone fees per city.

---

## 5. Staff Dashboard (`/staff`)

A deliberately smaller, operational subset of Admin — no bundles, promo codes, customer list,
support-inbox-only-view distinction, or settings access, since those stay Admin-only.

- **Dashboard home**: pending orders, low/out-of-stock count, **orders awaiting a driver**, and open
  delivery reports.
- **Orders**: the same shared order list/detail/status/driver-assignment tools Admin uses, including
  the same red no-driver alert and list badge.
- **Products**: the same product CRUD tools Admin uses.
- **Delivery accounts**: create and manage Delivery driver accounts (temp password shown once,
  deactivate/reactivate), with each driver's delivery history and total earnings.
- **Support inbox** and **Delivery support queue**: the same tools Admin uses, since Staff also
  handles customer support and driver problem reports.
- **Notifications inbox**: same badge/category-filter inbox, scoped to Staff's own operational
  notifications.

---

## 6. Delivery Dashboard (`/delivery`)

For drivers only.

- **Active deliveries**: the driver's own current assignments, each with a route map, customer
  contact info, and a "Mark [next status]" button (Picked Up → En Route → Delivered), or a "Mark
  Failed" option with a required reason.
- **History**: past deliveries (completed or failed), filterable by date range and order number.
- **Today's Collections**: a running total of cash the driver needs to hand over at end of day —
  the sum of today's completed Cash-on-Delivery orders — kept separate from the driver's own
  shipping-fee earnings, since drivers are salaried and this page answers "how much cash am I
  carrying," not "how much did I earn."
- **Report a Problem / My Reports**: file a delivery problem report (with an optional photo) and
  track its status until Staff/Admin resolves it.
- **Notifications inbox**: same badge/category-filter inbox, scoped to the driver's own delivery
  assignment notifications.

---

## 7. Cross-cutting platform features

- **Bilingual (English/Arabic)**: a language switcher available on every screen; Arabic renders
  full right-to-left layout mirroring, not just translated text — navigation, forms, tables, and
  charts all correctly flip direction.
- **Light/dark theme**: a manual toggle (not tied to OS preference) available on every screen,
  persisted per account; the two themes ("Botanical Chic" light, "Premium Luxe" dark) use a
  consistent brand color system throughout. The Analytics page is the one deliberate exception —
  it has its own fixed dark, high-contrast identity independent of this toggle, by design.
- **Notifications system**: a central simulated notification service (no real email/SMS/push
  provider — everything is logged as an in-app record) that fires on order status changes, order
  placement, loyalty points earned, wishlist price-drop/restock, support ticket replies, store
  credit adjustments, and operational alerts (like a confirmed order with no driver). Every account
  gets an unread-count badge on its Notifications nav link and category-filtered access to its own
  notification history.
- **Role-based access control**: every page and API route enforces which of the four roles can see
  or use it, with object-level ownership checks (e.g. a customer can't view another customer's
  order by guessing its ID — they get a "not found," not a permission error, so the existence of
  other people's data is never confirmed or denied).
- **Loyalty & rewards**: points earned per JD spent (configurable), redeemable at checkout; a
  Cash-on-Delivery order now earns its points and counts toward lifetime spend at the moment it's
  marked **Delivered** (previously COD orders never accrued anything, since payment confirmation
  for COD only really happens at the door).
