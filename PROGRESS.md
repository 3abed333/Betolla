# Betolla Cosmetics — Build Progress

**Last updated:** 2026-07-23 — build complete through Phase 12 (per the standing instruction below),
**plus Phase 13** (see §9): a theme-toggle bug fix, a new Delivery Support feature, mobile
hamburger/drawer navigation, an auto-hiding mobile storefront header, and an analytics expansion —
all planned, built, and verified this session. **Phase 13's i18n string retrofit was explicitly not
started** — see §9's closing note. This file is the single source of truth for where the build
actually stands — written from reading the live codebase, not from the original plan doc. The
final consolidated report for Phase 0-12 (what the standing instruction asks for at the very end)
was delivered in-chat at the end of that earlier session; this file has the full supporting detail
behind every line of that report, plus everything built in Phase 13 since.

Full original plan (architecture rationale, schema reasoning, seed-data plan): `C:\Users\VICTUS\.claude\plans\project-betolla-cosmetics-piped-crayon.md`
Running build log (phase-by-phase notes, feeds the final report): scratchpad `BUILD_LOG.md` (session-local temp dir, not in the repo).

**Standing instruction governing this build** (given mid-build, still in force): build straight
through Phase 4 → Phase 12 with no check-ins or approval pauses. Run automated ownership/privilege
self-checks at the end of Phase 7, end of Phase 8, and after Phase 9 — log failures, don't stop for
them. At the very end, produce one consolidated report: everything built/verified, every failure or
gap found, environment risks, and a risk-prioritized manual test list. No guest checkout, no 2FA,
notifications fully simulated — see §3.

---

## 1. Project Summary

Betolla Cosmetics is a bilingual (English/Arabic, full RTL) e-commerce platform for a cosmetics
brand: a customer storefront plus three internal role-based dashboards (Admin, Staff, Delivery),
all behind one shared login screen that redirects by role. It includes a full customer account hub
(orders, wallet/loyalty, wishlists, support tickets, saved addresses with map-pin picking), and is
scoped to eventually include a deep analytics suite (RFM segmentation, market-basket "frequently
bought together," CLV, sales heatmaps) once the dashboards are built.

**Stack**: Next.js 16 (App Router, Turbopack, React 19) + TypeScript + Tailwind CSS v4 · PostgreSQL
via Prisma 7 (driver-adapter architecture, `@prisma/adapter-pg`) · custom JWT auth (`jose`) with
DB-backed revocable sessions (not NextAuth) · Zustand + React Query · Radix UI primitives ·
`next-intl` for i18n · Leaflet/react-leaflet for map-pin address picking · `embedded-postgres` for
a local dev DB with no Docker/admin rights needed · `sharp` for image processing · Zod validation ·
`@react-pdf/renderer` for PDF export (installed, not yet used).

**Four roles** (`Role` enum: `CUSTOMER`, `STAFF`, `DELIVERY`, `ADMIN`):
- **Customer** — storefront + `/account` hub. Self-registers.
- **Staff** — subset of admin operational tools (orders, products) + creates Delivery accounts. Created only by Admin.
- **Delivery** — active deliveries, route info, status updates, earnings. Created only by Staff.
- **Admin** — full control: staff management, products/bundles, promo codes, users, support inbox, analytics, settings. Exactly one, seeded from env, never created via UI.

---

## 2. Phase Status Checklist

| Phase | Status | Summary |
|---|---|---|
| 0 — Scaffolding | ✅ Done | Next.js/TS/Tailwind v4 setup, folder structure, Prisma init, `embedded-postgres` local DB script, `.env`/`.env.example`. |
| 1 — Schema & seed | ✅ Done | Full 34-model Prisma schema (all enums/models below in §3), seed script + `prisma/seed-data/*.ts` producing realistic bilingual demo data. |
| 2 — Design system core + i18n skeleton | ✅ Done | Button/Input/Card/Badge primitives, base `next-intl` wiring (cookie-based locale, not URL-prefixed). |
| 3 — Auth & RBAC | ✅ Done | Register/login/logout, `Session` table, JWT cookie, `proxy.ts` coarse role-prefix check, layout-level `requireRole()`, `requireApiRole()` for API routes, `assertOwnership()` helper, login rate-limiting, role-based post-login redirect. Manually verified in-browser per the plan's Phase-3 verification step (all 4 seeded roles land on the correct dashboard; URL-guessing into another role's area redirects away). Extended well beyond that first manual spot-check by the Phase 7/8/9 self-checks (§5) — still no *automated test suite* (no Jest/Playwright harness exists), but ownership/role-gating is now thoroughly, if manually, exercised across every phase. |
| 4 — Design system completion | ✅ Done | Table, Dialog/ConfirmDialog, Toast (Zustand + Radix), StarRating, full ThemeToggle (DB+cookie synced, no-FOUC inline script), full LanguageSwitcher, Select/Tabs/DropdownMenu/Tooltip/Checkbox/Switch/Label/Textarea/Skeleton/EmptyState. |
| 5 — Storefront | ✅ Done | Header/footer, homepage (banners/categories/featured), listing+filter, product detail+gallery+reviews, cart (Zustand+localStorage, DB-synced), full checkout (address/payment, promo codes, store credit/loyalty redemption, mock COD/card payment), confirmation page, bundles listing+detail. Verified end-to-end in-browser as seeded customer "Sara" (see BUILD_LOG.md for the full walkthrough). |
| 6 — Customer Account Hub | ✅ Done | Nav shell, order tracker + reorder + per-item return requests, wallet (store credit/loyalty + tier progress), addresses (real Leaflet map-pin CRUD), wishlists, notification preferences grid, support tickets (create/list/reply), session management. Verified end-to-end in-browser as Sara. |
| 7 — Admin Dashboard | ✅ Done | See detailed breakdown in §2a below. All sections built, self-checked, verified. |
| 8 — Staff Dashboard | ✅ Done | Nav shell, KPI dashboard, Orders (shared components), Products (shared components), Delivery Account management (create/list/detail/deactivate) — see §2b. |
| 9 — Delivery Dashboard | ✅ Done | Active deliveries, route map, status updates, history, earnings — see §2c. Includes the earnings logic deferred from Phase 7's Settings section. |
| 10 — Notifications wiring | ✅ Done | Central `notify()` service + 6 real trigger points wired — see §2d. Also fixed a real pre-existing bug where the cart-DB-sync endpoint was silently 404ing for every logged-in user. |
| 11 — Deep analytics | ✅ Done | RFM segmentation (chart + recalculate action), frequently-bought-together, lifetime value, sales heatmap — see §2e. |
| 12 — Polish | ✅ Done | Responsive/RTL QA (found + fixed a real RTL phone-number bug in 5 places), confirmation-modal audit (found + fixed 1 real gap), docs pass (README/`.env.example` verified accurate, no changes needed) — see §2f. |

### 2a. Phase 7 (Admin Dashboard) — detailed breakdown

**Built and wired up (files exist, reachable via nav):**
- ✅ **Layout/shell**: `src/app/admin/layout.tsx` (guards `ADMIN` only via `requireRole`), `AdminNav.tsx` (11 nav links — several point to pages that don't exist yet, see "Not started" below), dashboard home `src/app/admin/page.tsx` (5 live KPI tiles: pending orders, low/out-of-stock count, open support tickets, total paid revenue, customer count — all real Prisma queries, no fake numbers).
- ✅ **Orders**: list + detail (`src/app/admin/orders/page.tsx`, `orders/[id]/page.tsx`), status-update and assign-driver actions via `/api/orders/[id]/status` and `/api/orders/[id]/assign-driver` (both `requireApiRole("ADMIN","STAFF")`), backed by `updateOrderStatus()`'s `VALID_TRANSITIONS` state machine in `src/lib/server/services/orders.ts` (restores stock on cancel). Shared `OrderStatusBadge`/`OrderTracker`/`OrderStatusActions`/`OrdersTable`/`OrderFilters` components live in `src/components/orders/` specifically so Staff (Phase 8) can reuse them without duplication.
- ✅ **Staff management**: list (`src/app/admin/staff/page.tsx`), detail/activity-log view (`staff/[id]/page.tsx`), row actions (edit/deactivate). `POST /api/admin/staff` and `/api/admin/staff/[id]` (PATCH/DELETE) are **ADMIN-only** (`requireApiRole("ADMIN")` — explicit comment in the route noting Staff/Delivery/Customer must never be able to hit this). Delete is a soft-delete (`isActive:false`) — deliberate, since `ActivityLog.actor` cascades from `User` and a hard delete would destroy that audit trail. Account creation goes through the shared `createManagedAccount()` service (`src/lib/server/services/accountCreation.ts`), which sets `mustChangePassword:true` and generates a temp password shown once via `CreateManagedAccountDialog.tsx` — this same service/dialog is what Phase 8's Staff→Delivery creation flow will reuse.
- ✅ **Products**: list/new/edit (`src/app/admin/products/{page,new/page,[id]/edit/page}.tsx`), row actions, image upload (`src/components/ImageUploader.tsx` → `POST /api/uploads`, `requireApiRole("ADMIN","STAFF")`, JPEG/PNG/WebP ≤8MB, resized/converted to WebP via `sharp`). `POST /api/products`, `PATCH/DELETE /api/products/[id]` — both `ADMIN|STAFF`, soft-delete pattern, SKU/slug uniqueness enforced in `src/lib/server/services/products.ts`.
- ✅ **Bundles** — **fully verified this session**: `src/app/admin/bundles/page.tsx` (list), `bundles/new/page.tsx`, `bundles/[id]/edit/page.tsx`, all consuming `src/components/BundleForm.tsx` (main-photo upload, bilingual name/description, bundle price, checkbox grid of component products with a live sum-of-components readout, active toggle). Backed by existing `POST /api/bundles`, `PATCH/DELETE /api/bundles/[id]` (`ADMIN|STAFF`, `src/lib/validation/bundle.ts`). `src/app/admin/bundles/BundleRowActions.tsx` added this session (mirrors `ProductRowActions.tsx`) for delete/deactivate parity with Products — wired into the list page.
  - `npx tsc --noEmit` and `npm run lint` both clean across all 5 files (4 pre-existing + new `BundleRowActions.tsx`).
  - Full browser walkthrough as Admin: list loads (3 seeded bundles) → Add Bundle (real photo upload via `/api/uploads`, bilingual fields, 2 component products selected, live sum-of-components readout confirmed correct at each step, `bundlePrice` correctly rounds to the schema's `Decimal(10,2)` — not a bug, matches every other money field in the schema) → saved, appeared in list → Edit → all fields (including which products were checked) confirmed pre-filled correctly from DB → changed name, saved, list reflected the change → Delete → confirm dialog → soft-deactivated (`isActive:false`), row stayed visible with an "Inactive" badge rather than disappearing, matching the Products pattern. Test bundle then removed from the DB directly (it was scratch verification data, not seed data).

**Not started (nav links / dashboard tiles already point here, but the routes 404):**
- ✅ **Abandoned Carts** (`/admin/abandoned-carts`) — read-only, no client component or API route
  at all: server component queries `Cart` where `status:"ABANDONED"` with items/user included,
  shows customer, cart value, items, and days-since-last-activity. `tsc`/`lint` clean (see the
  lint-rule note below), browser-verified against the 3 real seeded abandoned carts.
  - **Lint-rule note worth remembering**: this project's `react-hooks/purity` rule rejects
    `Date.now()` anywhere in a component body (even hoisted above JSX, even in a Server Component
    that only ever runs once per request) but accepts `new Date()` - confirmed empirically, and
    consistent with the pre-existing, already-passing `new Date().getFullYear()` call in
    `StorefrontFooter.tsx`. Use `new Date()` for "now" in any component/page file, never
    `Date.now()` - the rule doesn't distinguish server vs. client components.

**Built and verified this session (continuing straight through per standing instruction):**
- ✅ **Promo Codes** (`/admin/promo-codes`) — list (code, discount, segment, usage x/limit, status,
  actions), `new`/`[id]/edit` forms via shared `src/components/PromoCodeForm.tsx`
  (discount type/value, min order total, target segment, optional start/expiry dates, optional
  total/per-user usage limits, active toggle), and a `[id]` usage-stats detail view (total uses,
  total discount given, per-user limit, full usage table joined to customer + order). New routes
  `POST /api/admin/promo-codes`, `PATCH/DELETE /api/admin/promo-codes/[id]` — **`ADMIN`-only**,
  deliberately not `STAFF` (promo codes directly control discounting/margin), unlike
  Products/Bundles/Orders. Soft-delete (`isActive:false`) via `PromoCodeRowActions.tsx`, matching
  the Bundles/Products pattern. `tsc`/`lint` clean; full browser walkthrough as Admin covering
  list load (5 seeded codes) → usage detail on `VIP20` (real seeded data: 14/100 uses, 196.800 JD
  total discount given, correct customer/order joins) → create → edit (confirmed prefill) →
  delete (confirmed soft-deactivation) → test row cleaned from DB afterward.
  - Minor a11y-tooling note, not a product bug: the browser-automation tool's accessibility-tree
    reader occasionally drops a bare numeric-only table cell (e.g. an items/uses count) from its
    output while the value is correctly present in the actual DOM (confirmed via direct
    `textContent` reads both here and once earlier during Bundles verification). Not worth chasing
    further, but if a future session sees a "missing" number in a table via that tool, verify with
    a raw DOM read before assuming it's a rendering bug.

- ✅ **Users/Customers + Store Credit Adjustment** (`/admin/users`, `/admin/users/[id]`) — list
  scoped to `role:CUSTOMER` with search (name/email/username) and sort (recent/spend/orders,
  sorted in-memory against `CustomerStats` rather than a Prisma relation `orderBy`, since the
  20-customer scale makes that simpler than fighting nullable-relation sort edge cases). Detail
  page: header (name/email/username/phone/joined/active/RFM segment badge), stat cards (spend,
  orders, store credit, loyalty points), recent orders (linked to `/admin/orders/[id]`),
  addresses, and a merged wallet-history card (store credit + loyalty transactions). Store credit
  adjustment form posts to new `POST /api/admin/users/[id]/store-credit` (**`ADMIN`-only**), backed
  by `adjustStoreCredit()` in `src/lib/server/services/storeCredit.ts` — updates
  `User.storeCreditBalance` and inserts a `StoreCreditTransaction` row (with `createdById` set to
  the acting admin) inside one `prisma.$transaction`, and throws `StoreCreditError` if the
  adjustment would take the balance below zero.
  - `tsc`/`lint` clean. Full browser walkthrough as Admin: list loads (20 customers) → sort by
    spend correctly reorders (verified the top 3 against the actual max values) → detail page for
    "Nour Abdallah" renders real seeded data correctly (18 orders, Champions segment, 15.390 JD
    store credit, 754 loyalty points, address, mixed wallet history) → adjustment of −5 JD applied
    and reflected immediately (15.390 → 10.390) with a matching ledger row → over-large deduction
    (−1000 JD) correctly **rejected** by the negative-balance guard, balance unchanged → test
    adjustment then reverted directly in the DB (ledger row deleted, balance restored to exactly
    15.39) to leave seed data clean.

- ✅ **Support Inbox** (`/admin/support`, `/admin/support/[id]`) — list filterable by status
  (`SupportFilters.tsx`), detail view with a status-change `Select` and an assign-to-Staff/Admin
  `Select` (`TicketControls.tsx`), full message thread, and `AdminReplyForm.tsx` with an
  "internal note" checkbox. New `ADMIN|STAFF` routes `PATCH /api/admin/support-tickets/[id]/status`
  and `.../assign` (assigning validates the target is actually an Admin/Staff account; assigning an
  `OPEN` ticket auto-bumps it to `ASSIGNED`). The existing customer-facing
  `POST /api/support-tickets/[id]/messages` route (Phase 6) was **extended** rather than
  duplicated — it now also accepts Admin/Staff senders and an `isInternalNote` flag (customers can
  never set that flag; it's forced `false` server-side regardless of what a client sends), and a
  staff reply auto-transitions `OPEN|ASSIGNED → IN_PROGRESS` (customer replies keep the prior
  `RESOLVED → IN_PROGRESS` behavior). The per-message `updatedAt` touch on the parent ticket was
  preserved unconditionally (even a same-value status write) so both the customer's and admin's
  "most recently active" sort order keep working.
  - **Security fix made during this work, not present before**: internal notes are staff-only by
    design (`isInternalNote` existed on the schema since Phase 1 but nothing wrote or filtered it
    yet). Adding the admin reply path without also filtering the customer-facing read paths would
    have let a customer read staff-only internal notes on their own ticket. Fixed by adding
    `where: { isInternalNote: false }` to the customer's `/account/support/[id]` page query and to
    `GET /api/support-tickets/[id]` (which isn't currently called from any UI, but is a live,
    session-authenticated route, so it got the same filter for defense in depth).
  - `tsc`/`lint` clean. Full browser walkthrough: list loads with real seeded tickets (including
    Arabic-language ones, rendering correctly), opened an `OPEN`/unassigned ticket → assigned to
    Omar Nassar (status auto-flipped to `ASSIGNED`) → sent a customer-visible reply (status
    auto-flipped to `IN_PROGRESS`) → added an internal note (rendered with an "Internal note"
    badge, status correctly did not regress) → **logged in as the actual seeded customer (Mona
    Shahin) and confirmed the internal note does not appear**, neither on her `/account/support/[id]`
    page nor in the raw `GET /api/support-tickets/[id]` JSON → confirmed she gets a 404 (not 403,
    consistent with the existing ownership-hiding pattern) fetching a ticket that isn't hers →
    confirmed her requests to both new `/api/admin/support-tickets/.../status` and `.../assign`
    are correctly rejected with 403.
  - **Environment note, not a code bug**: hit the documented "Turbopack stale route-group
    manifest" issue again this session (see §4) — after the machine slept mid-session and the dev
    server was restarted a few times in a row, `/api/auth/login` and `/api/auth/me` both started
    404ing even though the files were untouched on disk. Fixed the same way as before: stop the
    server, `rm -rf .next`, restart. Confirmed via `ls` that the route files genuinely existed
    on disk before applying the fix, rather than assuming.

- ✅ **Settings** (`/admin/settings`) — one page, 3 tabs (`SettingsTabs.tsx`, Radix `Tabs`):
  **Loyalty Program** (`LoyaltyConfigForm.tsx` — points-per-JD, redemption value per point, edits
  the single `LoyaltyConfig` row via find-or-create so there's never more than one), **Loyalty
  Tiers** (`LoyaltyTiersManager.tsx` — inline-editable table + add row, hard add/edit/delete; no
  soft-delete needed since nothing holds a foreign key into `LoyaltyTier`, it's read by threshold
  lookup only), **Shipping Zones** (`ShippingZonesManager.tsx` — same inline pattern plus an
  `isActive` `Switch`; also a real hard-delete, confirmed safe since checkout resolves a zone by
  `cityEn` string match and snapshots the fee onto the order, so nothing references a
  `ShippingZone` row by foreign key either). New `ADMIN`-only routes: `PATCH
  /api/admin/settings/loyalty-config`, `POST /api/admin/settings/loyalty-tiers` +
  `PATCH/DELETE .../[id]`, `POST /api/admin/settings/shipping-zones` + `PATCH/DELETE .../[id]`.
  - **Deliberately deferred, not built**: "delivery earnings/commission config" from the original
    next-step list. There is no schema table for it (`DeliveryAssignment.earningsAmount` is just a
    per-assignment result column - nothing in the codebase computes or writes to it yet, confirmed
    by grep), and no calculation logic exists anywhere to configure. Building a settings form with
    no consumer would be exactly the kind of half-finished, disconnected-from-reality UI the
    project's own guidelines say to avoid. Deferring this to be designed **together with** Phase
    9's actual delivery-earnings logic (task below), not built blind now — flagging clearly here
    rather than quietly dropping it.
  - `tsc`/`lint` clean. Full browser walkthrough as Admin covering all three tabs: Loyalty Program
    prefilled with the real seeded values (1 pt/JD, 0.01 redemption) and a real PATCH round-trip
    confirmed; Loyalty Tiers showed all 4 real seeded tiers (Bronze/Silver/Gold/Platinum) correctly
    ordered, then a test tier added and deleted (both requests confirmed 200); Shipping Zones
    showed all 7 real seeded zones, a real fee edit on "As-Salt" (3 → 3.25 JD) was saved, confirmed
    persisted after a full page reload via direct DOM reads, then reverted back to 3 JD, and a
    test zone was added then deleted (both confirmed 200). No console errors throughout.

- ✅ **CSV export** — hand-rolled, no new dependency (`src/lib/csv.ts`, a small `toCsv()` with
  proper quote/comma/newline escaping). `GET /api/admin/orders/export` (`ADMIN|STAFF`, matching
  Orders' existing permission level, respects the same `status`/`q` filters as the Orders list) and
  `GET /api/admin/users/export` (`ADMIN`-only, matching the Users section, respects `q`). Both wired
  to an "Export CSV" button on their respective list pages (a plain `<a href>` download link, no
  client JS needed). Verified via direct `fetch()` of both routes: correct `Content-Type`/
  `Content-Disposition` headers, correct real data in every column, and the `status` filter
  correctly narrows the export (confirmed `?status=CANCELLED` returned only cancelled rows).
  **PDF export deliberately deferred to Phase 11**: the plan was "one summary PDF for the
  analytics page" - the analytics page doesn't exist yet, so there's nothing to summarize. Building
  it now would mean designing a PDF layout for numbers that don't exist yet, then redoing it once
  Phase 11 defines what the analytics page actually shows. `@react-pdf/renderer` is already
  installed and ready for when that phase starts.

- ✅ **Phase 7 ownership self-check — run, all passed.** Logged in as each of the 4 roles in turn
  (via direct `POST /api/auth/login` calls from the browser console, verifying identity via
  `GET /api/auth/me` before each sweep) and hit every sensitive endpoint built or touched this
  phase with dummy/fake IDs — safe because every route calls `requireApiRole(...)` as its first
  line, before any body parsing or DB lookup, so the permission check is provably independent of
  payload/entity validity.
  - **15 `ADMIN`-only API routes** (staff CRUD, promo-code CRUD, store-credit adjustment, all 3
    settings resources, users export): **403 for Staff, Delivery, and Customer**, **401 when
    logged out**. This is the exact check the standing instruction named
    (staff-creation/promo-code/store-credit) plus everything else built alongside it.
  - **7 `ADMIN|STAFF` API routes** (bundles CRUD, support-ticket status/assign, orders export):
    **403 for Delivery and Customer**, **401 when logged out**, and correctly **not blocked for
    Staff** (passed through to normal 400/404/200 responses).
  - **6 new `/admin/*` pages**, tested unauthenticated: all correctly redirect to
    `/login?next=<page>` rather than leaking any content. Initially this looked like a possible
    bypass — `fetch()` follows redirects by default, so a naive check of `response.status` on an
    unauthenticated page request reads `200`. Caught by checking `response.redirected`/
    `response.url`, which showed every one landing on the login page. Also tested logged-in-as-
    wrong-role (Staff hitting `/admin/promo-codes`): redirected to `/staff` instead of the page,
    not merely denied at the API layer. Flagging the near-miss so a future session's self-checks
    use `redirected`/`url`, not just `status`, when probing page routes.
  - **Not re-tested here, already proven earlier this session with real data**: support-ticket
    ownership (customer 404s on another customer's ticket) and the internal-note leak fix (Mona
    could not see Omar's internal note, neither via her page nor the raw API).
  - **Finding from this self-check, since found and fixed in a later session**: `POST
    /api/uploads` with a genuinely empty (zero-part) `FormData` body crashed the whole dev server
    process twice during this self-check, but returned a clean `400` on a third identical attempt
    — non-deterministic, not reproducible on demand at the time. Isolated to specifically
    zero-part multipart bodies: a `FormData` with at least one unrelated field (no `file` key)
    consistently returned a clean `400`, never crashed. **Not reachable through the actual UI** —
    `SingleImageUploader`/`GalleryUploader` only ever call the upload function after a real file is
    selected, always appending at least one part. But real enough to flag at the time: an API
    client hitting this route directly and skipping the UI could reproducibly-sometimes take the
    whole dev server down.
    - **Root cause (found in the follow-up session)**: the route already wrapped
      `request.formData()` in `.catch(() => null)`, which only catches a genuine promise
      rejection. The actual crash came from a lower level: Next.js's Undici-based multipart parser
      can, for a truly zero-part body, emit an error on the underlying stream outside the awaited
      promise chain, which `.catch()` never sees — it surfaces as an unhandled exception that
      takes down the whole process, rather than a rejection the route can trap. That's also why it
      looked non-deterministic (a teardown-timing race), and why it never happened for any
      malformed-but-non-empty body.
    - **Fix**: [src/app/api/uploads/route.ts](src/app/api/uploads/route.ts) now checks the
      `content-type` (must include `multipart/form-data`) and `content-length` (must be present
      and non-zero) headers and returns a clean 400 immediately if either is missing — *before*
      `request.formData()` is ever called — so the parser never runs on a genuinely empty body.
      The pre-existing `.catch()` and `!file` check are kept as defense-in-depth for other
      malformed-but-non-empty cases.
    - **Verified**: with the dev server running, sent 17 direct (non-UI) requests across 5 variants
      of empty/malformed bodies (zero-part browser `FormData`, empty body with no `Content-Type`,
      empty body with `multipart/form-data` and no boundary, empty body with a fake boundary, and
      no body at all) — all 17 returned a clean, consistent `400 {"error":"A file is required"}`,
      zero server errors/crashes in the logs, dev server stayed up throughout. Then sent one real
      upload (a genuine PNG, the same request shape `ImageUploader.tsx` uses) — `200`, correct
      `/uploads/products/....webp` URL returned, file confirmed written to disk (then removed, scratch
      test data only) — confirming the normal path is unchanged. `npx tsc --noEmit` and `npm run
      lint` both clean.
- ✅ Full `tsc --noEmit` and `npm run lint` were run after every single file added or changed this
  phase (not just once at the end) — always clean, see each subsection above.
- ✅ **Full Phase 7 verification pass, including the pieces built before this session that hadn't
  been re-checked** (Orders list/detail, Staff list/detail, Products list/edit) — and this pass
  **found and fixed a real, pre-existing password-hash-exposure bug**, not something introduced
  this session:
  - **`src/app/admin/orders/[id]/page.tsx`** queried `prisma.user.findMany({ where: { role:
    "DELIVERY", isActive: true } })` with **no `select`**, then passed the full result straight
    into `OrderStatusActions`, a `"use client"` component. Server→Client Component props get
    serialized into the page's RSC payload sent to the browser, so this meant **every active
    delivery driver's full `User` row — including `passwordHash` — was shipped to the browser on
    every admin order-detail page view.** React's dev console flagged it indirectly (a "Decimal
    objects are not supported" purity warning on `storeCreditBalance`, since `Decimal` isn't a
    plain object either), which is what surfaced it — the actual bug is the missing `select`, not
    the warning itself. `OrderStatusActions`'s own prop type already correctly declared it only
    needs `{ id, firstName, lastName }[]`; the caller just wasn't honoring that. Fixed by adding
    `select: { id: true, firstName: true, lastName: true }` to the query. Confirmed fixed: no
    console warning in a fresh tab, and the driver-assignment dropdown still correctly lists all
    4 real seeded drivers by name.
  - **Same bug, two more places, found by grepping every `prisma.user.findMany`/`findUnique` call
    in `src/app` for missing `select`s that flow into an HTTP response** (the RSC-prop-passing
    version is the same underlying mistake as returning a raw Prisma row straight from an API
    route — both ship the full row to the client, just via a different channel):
    `GET /api/admin/staff` returned `{ staff }` with full unselected rows, and `PATCH
    /api/admin/staff/[id]` returned `{ staff: updated }` the same way — both fixed with the same
    explicit field allowlist (`id, email, username, firstName, lastName, phone, isActive,
    createdAt`). Confirmed via direct `fetch()` after the fix: both now return exactly that field
    set, `passwordHash` absent, `PATCH` (deactivate/reactivate) still functions correctly.
  - **Swept the rest of the codebase for the same pattern** (every `prisma.user.*` call feeding
    either a `NextResponse.json()` or a Client Component prop) and found no further instances —
    `createManagedAccount()`'s response was already correctly narrowed
    (`{ id, email, username }` + a one-time temp password, by design), the Users list/detail pages
    only use the full row for server-rendered JSX text (never pass it into a client component —
    only primitives like `customer.id` cross that boundary), and `assignableUsers` in the Support
    Inbox detail page was already written with an explicit `select` from the start. This class of
    bug is worth remembering for Phases 8/9: **any `prisma.user.findMany`/`findUnique` whose
    result reaches a `"use client"` component's props, or gets spread into a `NextResponse.json()`
    call, needs an explicit `select` — TypeScript's structural typing will not catch an
    over-fetched superset being passed where a narrower type is declared, so `tsc --noEmit` stays
    clean even when this bug is present.**
  - Orders/Staff/Products (pre-existing from before this session) otherwise verified clean:
    list/detail pages load with real data, no other console errors, driver assignment and staff
    deactivate/reactivate both functionally confirmed working end-to-end after the fixes.
  - **Tooling notes from this pass**: `resize_window` with the `desktop` preset silently no-opped
    in this environment (viewport stayed at whatever it previously was); passing explicit
    `width`/`height` worked correctly and is the reliable option. Re-confirmed the
    stale-console-log-per-tab gotcha from §4 firsthand — the same fixed bug's error message
    reappeared when reading console logs from an old long-lived tab after the fix was already
    live and confirmed clean in a fresh tab; always open a new tab before trusting a "no errors"
    or "still has errors" read.

---

### 2b. Phase 8 (Staff Dashboard) — detailed breakdown

Built from scratch this session (was just a placeholder page before). Deliberately a reduced
"operational subset" of Admin, per the locked-in role model — no Bundles, Promo Codes,
Users/Customers, Support Inbox, Settings, or Abandoned Carts pages for Staff (those stay
Admin-only surfaces; Staff can still hit the underlying `ADMIN|STAFF` APIs where applicable, e.g.
bundles, but has no dedicated UI for them, which is an intentional scope decision, not an
oversight).

- **Layout/nav**: `src/app/staff/layout.tsx` (already guarded `STAFF`-only via `requireRole`, now
  gets a real nav) + new `StaffNav.tsx` (Dashboard/Orders/Products/Delivery Accounts), mirroring
  `AdminNav.tsx`'s pattern exactly.
- **Dashboard home** (`src/app/staff/page.tsx`): 3 KPI tiles relevant to Staff specifically
  (pending orders, low/out-of-stock, orders awaiting driver assignment) — a deliberately smaller
  set than Admin's 5, since revenue/customer-count aren't Staff's concern.
- **Orders** (`/staff/orders`, `/staff/orders/[id]`): reuses the exact same shared components
  Admin uses (`OrdersTable`, `OrderFilters`, `OrderStatusBadge`, `OrderTracker`,
  `OrderStatusActions` from `src/components/orders/`) — these were deliberately centralized back
  in Phase 7 specifically so this would be a thin wrapper, not a duplicate build. The Staff detail
  page omits the "view customer profile" link Admin's has (no `/staff/users/...` route exists by
  design), showing the customer's name as plain text instead.
- **Products** (`/staff/products`, `/staff/products/new`, `/staff/products/[id]/edit`): reuses
  the already-shared `ProductForm` and the newly-relocated `ProductRowActions` (see fix below).
- **Delivery Accounts** (`/staff/delivery-accounts`, `/staff/delivery-accounts/[id]`): the
  create-Delivery-account flow. New `POST /api/staff/delivery-accounts` (**`STAFF`-only, not
  `ADMIN`** — matches the locked-in role model's "Delivery accounts created only by Staff", a
  deliberate asymmetry with Admin-creates-Staff, not an oversight) reusing the existing
  `createManagedAccount()` service with `role: "DELIVERY"`, and `PATCH/DELETE
  /api/staff/delivery-accounts/[id]` for deactivate/reactivate/soft-delete. List page has the
  same `CreateManagedAccountDialog` Admin's Staff page uses (already role-agnostic via props, no
  changes needed). Detail page shows delivery-assignment history (status per attempt, total
  earnings summed from `DeliveryAssignment.earningsAmount`) plus the same activity-log pattern as
  Admin's Staff detail page.

**Two real fixes made while building this, not new bugs introduced by it:**
- **`ProductRowActions.tsx` relocated** from `src/app/admin/products/` to
  `src/components/products/` so both `/admin/products` and `/staff/products` import the same
  component — mirrors the `src/components/orders/` precedent from Phase 7, which the original
  plan explicitly called out as being centralized *for this exact reuse moment*. `Bundles`'s
  `BundleRowActions` stays admin-only-colocated since Staff has no Bundles UI in this build.
- **`ProductForm.tsx` had a hardcoded `router.push("/admin/products")`** after save — harmless for
  Admin, but would have silently misrouted Staff (an Admin-only page they can't access) after
  every product save. Added an optional `redirectPath` prop, defaulting to `/admin/products` so
  existing Admin pages needed zero changes, and Staff's new/edit pages pass `/staff/products`.
  Found by reading the shared component before wiring it into a second consumer, not by hitting
  the bug live — worth doing this check-before-reuse step for any other shared form component a
  future phase reuses across roles.

`tsc`/`lint` clean throughout. Full browser walkthrough logged in as Staff (Lina Haddad): dashboard
tiles load → Orders list/filter → order detail → advanced a real `PENDING` order to `CONFIRMED`
(status transitions are forward-only by design, so this was **not** reverted afterward — a
`PENDING→CONFIRMED` order sitting in seed data is normal, not test pollution) → Products list/new
form load clean → Delivery Accounts list (4 real seeded drivers) → detail page for Yousef Zeidan
showed real seeded delivery history (20 assignments, 48.750 JD total earnings) → created a test
delivery account (temp password shown once, confirmed) → deactivated it (`PATCH` 200) → deleted
from the DB afterward to leave seed data clean. No console errors at any step (checked in fresh
tabs throughout, per the stale-console-log lesson from Phase 7).

**Phase 8 ownership self-check — run, all passed.** Logged in as each of the 5 states (Admin,
Staff, Delivery, Customer, logged-out) via direct `POST /api/auth/login` calls and hit the new
Staff-only surface:
- `GET/POST /api/staff/delivery-accounts` and `PATCH/DELETE /api/staff/delivery-accounts/[id]`:
  **403 for Admin, Delivery, and Customer**, **401 logged out**, **not blocked for Staff**
  (Omar Nassar's `GET` returned 200; his `PATCH` on a nonexistent id correctly 404'd, past the
  auth gate). The Admin-gets-403 result specifically confirms the deliberate asymmetry — Admin
  cannot create Delivery accounts through this route, only Staff can, matching the locked-in role
  model rather than the more common `ADMIN|STAFF` pattern used elsewhere.
- `/staff` and `/staff/orders` page-level guard, checked via `response.redirected`/`response.url`
  (not just `status`, per the Phase 7 near-miss): Admin → redirected to `/admin`, Delivery → `/delivery`,
  Customer → `/` (storefront home), logged-out → `/login?next=%2Fstaff`, Staff → loads directly,
  no redirect.

---

### 2c. Phase 9 (Delivery Dashboard) — detailed breakdown

Built from scratch this session. This is also where the "delivery earnings/commission config"
item deferred from Phase 7's Settings section got resolved — see the design decision below.

- **Layout/nav**: `DeliveryNav.tsx` (Active Deliveries / History / Earnings), same pattern as
  Admin/Staff nav.
- **Active Deliveries** (`/delivery`): the driver's own `DeliveryAssignment` rows with status
  `ASSIGNED|PICKED_UP|EN_ROUTE`, each linking to a detail page.
- **Delivery detail** (`/delivery/[id]`): order items, customer name/phone, address text, a
  read-only route map (destination pin only, no click-to-edit — see `DeliveryRouteMap.tsx` vs.
  the existing editable `MapPinPicker.tsx`), and status-advance controls
  (`DeliveryStatusActions.tsx`: single "Mark X" button for the forward transition, plus a "Mark
  Failed" dialog requiring a reason). Ownership-checked via `assertOwnership(session,
  assignment.driverId)` — a driver hitting another driver's assignment id gets redirected, not an
  error page.
- **History** (`/delivery/history`): terminal-status (`DELIVERED`/`FAILED`) assignments, showing
  the failure reason inline where applicable.
- **Earnings** (`/delivery/earnings`): total + this-month summary tiles, plus a chronological list
  of delivered assignments and their payout.
- **New service**: `updateDeliveryAssignmentStatus()` in `src/lib/server/services/delivery.ts`,
  mirroring `updateOrderStatus()`'s existing shape — its own `VALID_TRANSITIONS` state machine
  (`ASSIGNED→PICKED_UP→EN_ROUTE→DELIVERED`, or `→FAILED` from any non-terminal state, both
  terminal states are dead ends by design; a failed delivery gets reassigned by Admin/Staff as a
  **new** `DeliveryAssignment` row via the existing `assign-driver` route, never resurrected).
  Every call ends by invoking `syncOrderStatusFromDelivery()` — the schema's designated single
  sync point (written back in an earlier phase, confirmed via grep to have never actually been
  called from anywhere before this phase) — so `Order.status` stays in sync without this new code
  ever touching `Order.status` directly itself. New `PATCH
  /api/delivery/assignments/[id]/status` route, `DELIVERY`-only, ownership-checked (wrong driver
  gets the same 404-hides-existence treatment as support tickets), takes `{status,
  failedReason?}`.
- **Earnings design decision (resolves the Phase 7 deferral)**: a driver's payout for a completed
  delivery is **the order's `shippingFee`, credited in full**, set at the moment a delivery
  transitions to `DELIVERED` (never on `FAILED` - matches the "Failed attempts" stat already shown
  on Staff's driver detail page, which only makes sense if failures don't earn anything). Chosen
  over adding a new commission-percentage config table because: (a) it needs zero schema changes
  or migrations, (b) the "config" already exists and already has an admin UI — Phase 7's Shipping
  Zones settings page — so a Staff/Admin adjusting a zone's fee automatically adjusts driver pay
  for that zone too, one lever instead of two, (c) "courier keeps the delivery fee" is a
  defensible plain-language real-world model. The simpler alternative not built: a separate
  percentage-of-fee commission config. Flag this to the user if a different commission model was
  actually intended — this was a judgment call made to unblock the phase, not something explicitly
  specified.

**Real bug found and fixed while building this — Leaflet cannot be server-rendered, and this
phase's map is the first one that isn't gated behind a client-only Dialog:**
- The existing `MapPinPicker.tsx` (Phase 6) only ever mounts inside a Radix `Dialog`, which is a
  pure client-side mount that never participates in the server-rendered HTML — so it never hit
  this. `DeliveryRouteMap` renders directly in the normal page flow of a Server Component
  (`/delivery/[id]/page.tsx`), which means Next.js's App Router **does** server-render it despite
  its `"use client"` directive (that directive marks a bundling boundary, not an SSR opt-out) —
  and Leaflet touches `window`/`document` on import, which doesn't exist during SSR. Symptom was
  a repeating, non-obvious console error ("Encountered a script tag while rendering React
  component") on any page where the map actually had coordinates to render (silent/absent when
  there were none, which is every seeded address, since none of them have `lat`/`lng` populated -
  only a real user clicking the live map picker sets those - so this would have shipped invisibly
  until the first real driver opened a delivery to an address with a saved pin).
  - Diagnosed by checking Next.js 16's actual docs (`node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`)
    per `AGENTS.md`'s standing instruction, rather than assuming `next/dynamic` behavior from
    training data — confirmed `ssr: false` is disallowed inside Server Components and must live in
    a Client Component wrapper.
  - Fixed with a new `DeliveryRouteMapLoader.tsx` (`"use client"`, does
    `dynamic(() => import("./DeliveryRouteMap")..., { ssr: false })`) that the Server Component
    page imports instead of the map directly. Confirmed fixed in a fresh tab (zero console errors)
    and confirmed the map still renders correctly (screenshotted) after the fix, using a real
    lat/lng temporarily written directly to one address for the test (reverted to `null`
    immediately after, since no seed data or real UI flow had ever set it).

`tsc`/`lint` clean throughout. Full functional walkthrough logged in as Yousef Zeidan (a real
seeded driver with 6 active assignments at the time): Active Deliveries list correct → opened an
assignment with no saved map pin (graceful "No map pin saved" fallback, confirmed intentional
after checking seed data never sets `lat`/`lng`) → advanced a `PICKED_UP` delivery through
`EN_ROUTE → DELIVERED` (confirmed `Order.status` synced to `DELIVERED` via a fresh
`OrderStatusHistory` row, confirmed earnings credited as exactly the order's shipping fee, on an
order that happened to have a non-zero fee to make the check meaningful) → marked a different
assignment `FAILED` with a reason (confirmed `Order.status` deliberately did **not** change,
matching the "Admin/Staff decide the reassignment" design) → Earnings page showed both completions
correctly totaled alongside 30 pre-existing real seeded payouts → History page loads clean. No
console errors anywhere after the Leaflet fix, checked in fresh tabs throughout.

**Test-data note, same reasoning as Phase 8's order-status test**: `DeliveryAssignment.status` is
also a forward-only state machine by design (no valid transition back to `ASSIGNED` from
`DELIVERED`/`FAILED`). The two assignments advanced to `DELIVERED` and the one marked `FAILED`
during this verification were **not** reverted — doing so would require hand-editing state the
app itself never allows, which would be a worse inconsistency than leaving a realistic forward
transition in seed data. Only the manually-DB-written test `lat`/`lng` (never something the app
itself would produce without a real user click) was reverted.

**Multi-tab testing gotcha worth remembering**: opening a second browser tab and logging in as a
different role there does **not** isolate sessions — cookies are shared per-origin across all
tabs in this browser context, so logging in as a customer in tab B silently logged tab A's driver
session out too. Mid-verification, always re-check `GET /api/auth/me` before trusting which
identity a given tab is actually acting as, rather than assuming the last login call in that
specific tab is still active.

**Phase 9 comprehensive privilege-chain self-check — run, all passed, zero regressions found.**
This was explicitly asked to be more thorough than the Phase 7/8 checks, so it covered both new
Phase 9 surface and a cross-phase regression sweep of everything built in Phases 7 and 8 together,
not just what was built this phase:
- **Object-level ownership (the specific example named up front)**: logged in as Yousef Zeidan and
  targeted Khaled Fares's real assignment id directly — `PATCH
  /api/delivery/assignments/{khaled's id}/status` → **404** (hides existence, doesn't reveal
  whether the id exists), and `GET /delivery/{khaled's id}` → redirected to Yousef's own `/delivery`
  rather than showing Khaled's data. Then independently re-queried Khaled's assignment directly
  from the DB and confirmed its status was genuinely unchanged — the ownership check blocks the
  write, not just the response.
- **Role gate on the new Delivery-only surface**: `PATCH /api/delivery/assignments/[id]/status`
  and the `/delivery/*` pages — **403/redirect for Admin, Staff, and Customer**, **401/redirect-
  to-login for logged-out**, checked via `response.redirected`/`.url` for the page routes (not
  just `status`, per the Phase 7 near-miss lesson).
  - Correctly redirects logged-in-wrong-role sessions to *their own* dashboard, not a bare error:
    Admin → `/admin`, Staff → `/staff`, Customer → `/`.
- **Cross-phase regression sweep**: as Customer, hit one representative sensitive endpoint from
  every phase in a single batch — Phase 7's `/api/admin/staff`, `/api/admin/promo-codes`,
  `/api/admin/users/.../store-credit`, `/api/admin/settings/loyalty-config`,
  `/api/admin/users/export`, `/api/bundles`, `/api/admin/orders/export`,
  `/api/admin/support-tickets/.../status`; Phase 8's `/api/staff/delivery-accounts`; Phase 9's
  `/api/delivery/assignments/.../status` — **all 10 correctly 403'd**, confirming nothing built in
  Phase 8 or 9 accidentally loosened anything from Phase 7. Repeated the same batch as a Delivery
  driver against a Phase-7/8-flavored subset (staff creation, promo codes, store credit, bundles,
  orders export, delivery-account creation) plus the pre-existing `assign-driver` route — **all
  403'd** for Delivery too, confirming a driver can't self-assign orders or reach any Staff/Admin
  surface either.

---

### 2d. Phase 10 (Notifications wiring) — detailed breakdown

- **Core service**: `notify()` in `src/lib/server/services/notifications.ts` — takes
  `{userId, category, title, body, relatedOrderId?}`, reads that user's enabled channels for the
  category from `NotificationPreference`, and writes one `Notification` row per enabled channel
  (nothing at all if every channel is off, matching how the existing preferences grid UI already
  treats a missing/disabled row). Fully simulated per the standing "no real provider, ever"
  instruction — this only ever writes DB rows, never calls anything external.
- **Six real trigger points wired**, all going through `notify()`:
  1. **Order status changes** (`updateOrderStatus()` and `syncOrderStatusFromDelivery()` in
     `orders.ts`) — `CONFIRMED`/`ON_DELIVERY`/`DELIVERED`/`CANCELLED`, category `ORDER_UPDATES`.
     Both the Admin/Staff-driven path and the driver-driven path (Phase 9) now notify identically,
     since both funnel through the same two functions.
  2. **Order placed** (`placeOrder()` in `checkout.ts`) — fires right after the order transaction
     commits, category `ORDER_UPDATES`. Not explicitly named in the original Phase 10 list but a
     natural sibling of "order status changes" and the most-expected notification in any
     e-commerce flow, so added it.
  3. **Loyalty points earned** (`placeOrder()`) — only when `loyaltyPointsEarned > 0` (i.e. the
     order was `PAID` immediately, not COD), category `LOYALTY_AND_WALLET`.
  4. **Wishlist price-drop / restock** (`notifyWishlistsOnProductChange()`, called from `PATCH
     /api/products/[id]`) — compares the product's price/stock before vs. after the edit; fans out
     to every `WishlistItem` referencing that product, gated by **both** that item's own
     `notifyOnPriceDrop`/`notifyOnRestock` flag (schema already had these, unused until now) *and*
     the owner's general `BACK_IN_STOCK` category preference.
  5. **Support ticket replies** (`POST /api/support-tickets/[id]/messages`, the route
     extended in Phase 7 for staff replies) — only fires customer-ward on a staff/admin reply that
     isn't an internal note (internal notes are invisible to the customer, so notifying about one
     would leak that a note exists). Category `SUPPORT`.
  6. **Store credit adjustment** (`adjustStoreCredit()`) — category `LOYALTY_AND_WALLET`, fires on
     every admin-initiated balance change (Phase 7 feature), positive or negative.
  7. **Abandoned-cart recovery** — the plan called for this but there's no cron/scheduled-job
     infrastructure in this build to auto-detect "cart went stale," so this is **admin-triggered**:
     a new "Send Reminder" button on the existing `/admin/abandoned-carts` page (Phase 7), calling
     new `POST /api/admin/abandoned-carts/[id]/remind` (`ADMIN`-only), category `PROMOTIONS`. This
     is a deliberate scoping call, not a missed requirement — flagging it since "wire the trigger"
     could be read as wanting it fully automatic; it isn't, because nothing in this codebase runs
     on a schedule.
- **Registration now seeds default `NotificationPreference` rows** (`POST /api/auth/register`) —
  previously **only the seed script created these**, meaning a real new signup would have zero
  preference rows and `notify()` would have silently sent them nothing, forever, until they
  visited their preferences page and toggled something on. Reused the exact same default matrix
  the seed script already uses (`DEFAULT_NOTIFICATION_PREFERENCES`, now exported from
  `notifications.ts` so both places import one source of truth instead of two copies that could
  drift). This was a pre-existing gap, not introduced this session, but it would have made the
  entire feature built this phase non-functional for anyone who registers from now on, so it was
  in-scope to fix alongside the wiring itself.

**Real, pre-existing bug found and fixed while testing the checkout trigger — the cart's
DB-sync endpoint had the wrong URL and had likely never worked:**
- `src/hooks/useCartSync.ts` (mounted near the app root, debounces local Zustand cart changes to
  the server "so logged-in carts are visible server-side for abandoned-cart tracking") was
  `fetch`-ing `POST /api/cart/sync` — but the actual sync handler is the `POST` export of
  `src/app/api/cart/route.ts` itself, i.e. the correct URL is `POST /api/cart`. `/api/cart/sync`
  as a route **does not exist on disk**, so every single sync attempt 404'd, silently (the fetch
  has a bare `.catch(() => undefined)`, so this never surfaced as a visible error to a user or in
  any console anyone would have been watching). The "Add to Cart" button itself still worked
  perfectly (it's a synchronous local Zustand + localStorage write, decoupled from this
  background sync), which is exactly why this went unnoticed through every prior phase's storefront
  testing - the cart *looked* completely fine from a shopper's perspective.
  - **Real impact**: the server-side `Cart`/`CartItem` rows this whole build's abandoned-cart
    tracking depends on were **never being created or updated** for any real (non-seeded)
    session, for the entire build up to this point. Every abandoned cart verified anywhere in
    this project (Phase 7's admin page, this phase's reminder button) was seeded data — confirmed
    directly by re-running the exact repro after the fix and checking the DB: a fresh `Cart` row
    with the correct `CartItem` appeared for the first time.
  - Found by accident while verifying the checkout notification trigger (noticed a stray 404 in
    the network log that didn't match anything expected), not by dedicated cart testing — a good
    argument for reading network activity during any browser verification pass, not just console
    errors.
  - Fixed with a one-line change (`"/api/cart/sync"` → `"/api/cart"`). Confirmed fixed: the next
    debounced sync after the fix returned `200 OK`, and a direct DB query showed a real `Cart` +
    `CartItem` row created for the test session.

`tsc`/`lint` clean throughout. Verified every trigger with real data end-to-end, checking the
actual `Notification` rows in the DB after each action (not just "no console error," since these
triggers have no visible UI feedback of their own beyond the action's normal success toast):
confirmed an order-status change produced exactly the 3 rows its channel preferences predict
(EMAIL/IN_APP/SMS, no PUSH); a wishlist price-drop produced exactly 2 (EMAIL/IN_APP, no SMS -
`BACK_IN_STOCK` doesn't get SMS by default); an abandoned-cart reminder produced 2
(EMAIL/IN_APP); a staff support reply produced 2 for the customer; a store-credit adjustment
produced 2, then the adjustment itself was reverted via the UI (`+1` then `-1`, back to the exact
original `15.390` JD balance); and a full real checkout run (browse → add to cart → address →
COD → place order) produced the "Order placed" notification (no loyalty notification, correctly,
since COD orders aren't `PAID` immediately - confirmed this is the pre-existing, unchanged
`loyaltyPointsEarned` gating logic, not a new bug). The placed test order (`BT-...`) was **not**
rolled back, matching the established reasoning from Phases 8/9: it's a real, valid outcome of
exercising the real system, and unwinding it would mean hand-editing state the app itself has no
path to reach.

**Tooling/environment notes from this pass**:
- The long-lived "seed" browser tab stopped registering clicks correctly partway through this
  phase (`resize_window` reported success but the page rendered squeezed into a fraction of the
  reported viewport, and clicks at computed coordinates landed on nothing). Switching to a freshly
  opened tab immediately resolved it. Given this tab had been open across the entire session with
  dozens of resizes and navigations, this reads as accumulated state drift specific to that one
  tab, not a systemic tool issue - if a tab's interactions stop working mid-session, open a new
  one rather than debugging the old one further.
  - **Every browser widget shown for the rest of this build should default to opening a fresh
    tab for interactive verification**, reserving the long-lived tab only for simple
    non-interactive `fetch()` checks via `javascript_tool`.
- Storefront routes not yet visited this dev-server session (this was the first time in the whole
  session `/products/[slug]` had been opened) cost a real, visible Turbopack cold-compile delay
  (1-1.5s "Fast Refresh rebuilding" in the console) during which clicks don't register - a repeat
  of the general Turbopack dev-server flakiness already logged in §4, not a new phenomenon, but
  now confirmed to specifically manifest as "the button looked clickable but nothing happened" on
  a route's first-ever visit.

---

### 2e. Phase 11 (Deep analytics) — detailed breakdown

New `/admin/analytics` page, built from scratch (was a 404 before this phase despite nav links
and the dashboard's "Total Revenue" tile already pointing to it since Phase 7).

- **RFM segmentation**: the quintile-scoring + segment-classification algorithm existed **only**
  inside `prisma/seed.ts` before this phase (one-time, at seed time) - `customerStats.ts` already
  had a docstring forward-referencing a `recomputeAllRfmSegments()` function that didn't exist
  yet, naming exactly this phase. Extracted/ported that logic into a real, reusable
  `recomputeAllRfmSegments()` in `src/lib/server/services/customerStats.ts`, wired to a new
  `POST /api/admin/analytics/recompute-rfm` (`ADMIN`-only) and a "Recalculate Segments" button.
  Segment counts render as a `recharts` bar chart (`RfmSegmentChart.tsx`) - **colored as an
  ordered health spectrum (green→gold→gray→red), not 7 arbitrary categorical hues**, since the
  segments themselves are an ordered best-to-worst spectrum, not unordered identities; added one
  new CSS token (`--critical`, red, light/dark) to `globals.css` alongside the existing
  cta/accent/success/highlight tokens for the "at risk/lost" end of that spectrum, since nothing
  needed a solid danger *fill* color before (only Badge's own hardcoded destructive-variant
  classes, which don't work as an SVG `fill`). Chart colors are literally `var(--success)` etc.,
  so light/dark both work automatically with no theme-detection JS - screenshotted and confirmed
  both.
- **Frequently bought together**: `getFrequentlyBoughtTogether()` in the new
  `src/lib/server/services/analytics.ts` - computed in-process over every `OrderItem` (grouped
  into per-order "baskets," then counted pairwise co-occurrence across baskets) rather than a
  hand-written SQL self-join, since at this app's real scale (a few hundred orders) that's simpler
  to read, easier to verify, and fast enough to run on every page load. Shows the overall top 10
  pairs, not a per-product drill-down (kept to what a dashboard-level "frequently bought together"
  reasonably needs).
- **Customer lifetime value**: `getTopCustomersByLifetimeValue()` - a deliberately honest metric,
  **realized spend to date** (the same number `CustomerStats.totalSpent` already tracks), labeled
  as such, not a predictive/forecasted CLV. A forward-looking CLV formula needs a retention-period
  assumption this app has no real basis for; showing a number dressed up with a fabricated
  multiplier would read as more rigorous than it actually is. Flagging this as a deliberate scope
  decision, not a missed requirement, in case a true predictive CLV was actually wanted.
- **Sales heatmap**: `getSalesHeatmap()` buckets every `PAID` order into a day-of-week x 4-hour
  time-block grid (42 cells; hourly would have been 168 - too dense to read at a glance).
  Hand-rolled as a plain HTML table with CSS background-color intensity (sequential single-hue,
  `var(--cta)` at variable opacity) rather than a `recharts` component, since recharts has no
  clean native heatmap primitive and a styled table is simpler and more direct for this specific
  shape. Exact figures surface via native `title` tooltips on hover (cheap, zero-JS "hover layer"
  for a grid this dense).
- Followed the project's `dataviz` skill guidance on structure (one axis, no dual-axis, sequential
  = one hue light→dark, color assigned by the job it does rather than picked first) using the
  **app's own existing locked-in brand tokens** as the color parameters rather than the skill's
  own generic default palette - this is an extension of an already-branded app, not a fresh
  artifact, so the existing "Botanical Chic"/"Premium Luxe" palettes are the right source of truth
  to extend, not replace.

`tsc`/`lint` clean. Full browser walkthrough as Admin, screenshotted in both dark and light mode:
RFM chart renders correctly with real seeded distribution (6 Champions, 2 Loyal, 5 Potential
Loyalist, 0 New Customer, 1 Needs Attention, 1 At Risk, 6 Lost) → clicked Recalculate Segments,
confirmed "Recalculated segments for 20 customers" and the chart re-rendered from fresh data →
Top Customers by Lifetime Value showed real customers correctly sorted descending (1221.920 JD
down to 360.200 JD) with correct segment badges and working links to their admin detail pages →
Frequently Bought Together showed 10 real, plausible product pairs → Sales Heatmap showed a full
7x6 grid of real order counts/revenue, correctly all-zero in the two overnight blocks (no seeded
orders land there) and heaviest in evening blocks.

---

### 2f. Phase 12 (Polish pass) — detailed breakdown

An audit/fix phase, not new-feature building - scoped to the 3 items the plan named.

**Confirmation-modal audit**: grepped every client-side `fetch(..., {method:"DELETE"})` call site
(11 files) and checked each against `ConfirmDialog`.
- **Real gap found and fixed**: `WishlistsClient.tsx`'s "Delete list" button called the delete
  API immediately on click, no confirmation - the only entity-delete action in the whole app
  without one (every admin/staff delete this session, plus the pre-existing address delete, all
  use `ConfirmDialog`). Notable because `DELETE /api/wishlists/[id]` is a genuine **hard** delete
  (`prisma.wishlist.delete`, cascades to every saved item in that list) - confirmed by reading the
  route before fixing, not assumed. Fixed by wrapping the trigger in `ConfirmDialog`, matching the
  established pattern exactly. Verified live: created a second list, opened the dialog, clicked
  Cancel (list survived), reopened, clicked Delete (list gone, the *other* real list with real
  items untouched).
- **Reviewed and left as-is, deliberately**: single wishlist-item removal and `AddToWishlistButton`
  (both standard low-stakes toggle/remove UX, confirming would be annoying, matches how "remove
  from cart" works everywhere) and `RevokeSessionButton` (revoking one login session is a common,
  low-friction, fully reversible security action in most apps - GitHub/Google don't confirm this
  either - flagging the judgment call rather than silently leaving it unexamined).

**RTL QA pass** - caught a real, previously-invisible bug because a seeded customer account
happened to have Arabic as its stored locale, which surfaced it naturally rather than needing a
deliberate repro:
- **Bug**: phone numbers rendered with the leading `+` at the *end* of the digit string (e.g.
  `962791112233+` instead of `+962791112233`) anywhere they appeared inside an RTL-direction page.
  Root cause: `dir` is set once on the root `<html>` element for the whole app (not per-section),
  driven by the logged-in user's stored `locale` - customers were seeded with a 50/50 random
  EN/AR locale, so roughly half of them would hit this on their own addresses page, and it would
  also hit Admin/Staff/Delivery views of a customer's or driver's phone number if *that* viewing
  user (not the phone's owner) had an AR locale. The digits themselves are LTR content; without
  explicit isolation they inherit the ambient RTL flow, which is what moved the `+`.
  - Found on `/account/addresses` while doing an incidental screenshot during the responsive
    pass (Sara Khoury's seeded locale is AR) - not a targeted phone-number test, which is a good
    reminder that an RTL QA pass needs at least one real logged-in-as-a-seeded-customer check,
    not just toggling the language switcher as Admin/Staff (whose seeded locale is EN, so they'd
    never hit this by just clicking the toggle icon on their own dashboard chrome).
  - Grepped for every other read-only render of a `.phone` field and found the identical pattern
    in 4 more places: `admin/users/[id]` (twice - the customer's own phone, and each saved
    address's phone), `delivery/[id]` (customer phone shown to the assigned driver), and
    `staff/delivery-accounts/[id]` (a driver's own phone shown to Staff). Fixed all 5 the same
    way: wrap the phone value in `<span dir="ltr" className="inline-block">`. Confirmed the fix
    with a fresh screenshot of Sara's addresses page (both phone numbers now correctly read
    `+962...`).
- **Layout mirroring itself** (nav position, product grid, filter pills, card layout, text
  truncation direction) checked across the storefront, account, and a plain-text scan of admin -
  all correctly mirror with `dir="rtl"` and no visual breakage, confirmed by screenshot at the
  default mobile-ish viewport. Text content stays English throughout (the already-logged,
  deliberately-not-fixed-mid-build i18n gap from §3 - this phase didn't change that scope).

**Responsive QA pass**: mobile width (~375-450px) was already exercised on effectively every page
built or touched this entire session (dozens of pages, by simple virtue of that being this
browser tool's default viewport) - genuinely well-covered, not a token check. Tablet/desktop
needed a dedicated pass:
- Confirmed via `getComputedStyle`/`window.innerWidth` (not screenshots - see the tooling note
  below) that both the storefront product grid (`admin/products`-style pages) and the
  Admin/Staff/Delivery sidebar layout (`flex-col` → `sm:flex-row`) respond correctly at 768px: the
  product grid lays out in 3 even columns, the admin sidebar sits beside the content with no
  horizontal overflow (`document.body.scrollWidth` matched `window.innerWidth` exactly).
- **Tooling note, not an app bug**: `resize_window` to a non-default size (tablet preset, and
  explicit 768x1024/1280x800) intermittently made `computer{action:"screenshot"}` capture a
  visually squeezed, mis-scaled image (real content confined to a small top-left region, rest of
  the canvas black) - across a brand-new tab, on the first resize call, ruling out the
  stale-tab-state theory from earlier in this session. Diagnosed by checking
  `window.innerWidth`/`document.body.scrollWidth` directly via `javascript_tool`: both reported
  the correct, requested dimensions with zero horizontal overflow, and `getComputedStyle` on the
  product grid showed the correct 3-column layout actually in effect - meaning the **page itself
  renders correctly**; only this session's screenshot capture at non-default sizes is unreliable.
  Worth knowing for future sessions: prefer `window.innerWidth`/`getComputedStyle` checks over
  screenshots when verifying non-default viewport sizes in this environment, and don't read a
  squeezed screenshot as evidence of an actual layout bug without cross-checking computed styles
  first.

**Docs pass**: read `README.md`, `.env.example`, and `package.json`'s `scripts` block against each
other. All three are already accurate and mutually consistent - `README.md` was apparently
written early against the *target* feature set (it already mentions "Admin, Staff, and Delivery
dashboards," "loyalty & wallet," "a full analytics suite," and lists Recharts/Leaflet in the tech
stack), and this session's work has now caught up to match what it already described. No changes
needed. One pre-existing, unused env var noted for awareness, not fixed: `NEXT_PUBLIC_APP_URL`'s
comment says it's for "building absolute links... in simulated notifications," but no notification
built in Phase 10 actually uses it (bodies are short text only, no link) - consistent with there
being no notification-viewing UI/inbox for a link to point at (see the Phase 10 write-up and the
gaps list below). Not a bug, just flagging an unused piece of scaffolding for the final report.

`tsc`/`lint` clean after every fix in this phase.

---

## 3. Key Architectural Decisions (locked in — do not re-litigate)

- **Auth**: Custom JWT (`jose`) in an httpOnly cookie carrying `{userId, role, sessionId}`, backed
  by a DB `Session` table so sessions are server-revocable (chosen specifically over NextAuth,
  whose Credentials provider doesn't support real DB-backed revocable sessions). Two-layer guard:
  `src/proxy.ts` does a fast claims-only redirect by role-prefix (`/admin`, `/staff`, `/delivery`,
  `/account`); the authoritative check is `requireRole()` (page/layout, DB-backed, in
  `src/lib/auth/guards.ts`) and `requireApiRole()` (API routes, `src/lib/auth/api-guard.ts`).
  Object-level ownership goes through `assertOwnership(session, resourceUserId)`, one centralized
  helper, not ad hoc per-route checks.
- **No 2FA anywhere** — explicitly dropped mid-planning ("sorry i added his by mistake, dont put
  2fa authentication for now"). Do not add it back without being asked.
- **No guest checkout** — checkout requires a logged-in account, by deliberate choice.
- **Notifications are fully simulated** — no real email/SMS/push provider. `Notification` is an
  in-app log table (`status`: SENT/FAILED) and `NotificationPreference` gates what "would" be sent.
  Phase 10 wires the actual trigger points; nothing sends anything real, ever, in this build.
- **Order status is split into two independent enums**, not one combined list:
  `OrderStatus` (`PENDING → CONFIRMED → ON_DELIVERY → DELIVERED`, or `CANCELLED`) and
  `PaymentStatus` (`UNPAID`, `PAID`, `REFUNDED`). `DeliveryAssignment.status` (driver-facing, finer
  grained: `ASSIGNED/PICKED_UP/EN_ROUTE/DELIVERED/FAILED`) is a **third**, separate field kept in
  sync with `Order.status` from exactly one place: `updateOrderStatus()` /
  `syncOrderStatusFromDelivery()` in `src/lib/server/services/orders.ts`. Don't hand-edit
  `Order.status` from a delivery-status change anywhere else.
- **Soft-delete, not hard delete**, for `User`/`Product`/`ProductBundle` (`isActive: false` flag).
  Deliberate: `ActivityLog.actor` cascades from `User` (`onDelete: Cascade`), so hard-deleting a
  user/product would silently destroy audit-trail rows referencing it.
- **Two fixed brand palettes**, implemented as CSS vars in `src/app/globals.css`, mapped into
  Tailwind v4 `@theme inline` tokens (`bg-surface`, `text-ink`, `bg-cta`, etc.) — never hardcode a
  hex value in a component.
  - **Light ("Botanical Chic")**: surface `#faf7f2`, surface-secondary `#f0e6d6`, ink `#2b2926`,
    ink-muted `#6b655d`, cta `#1b4332` (Forest Green), accent `#c1662f` (Terracotta), highlight
    `#f2d4d9` (Blush Pink), success `#1b4332` (doubles with cta — no separate swatch was given),
    border `#e8dfcf`.
  - **Dark ("Premium Luxe")**: surface `#18181b`, surface-secondary `#4b4f5a`, ink `#ede0c8`,
    ink-muted `#f5f5f2`, cta `#c9a227` (Bronze Gold), accent `#c9a227` (same as cta — no separate
    swatch given), highlight `#5c616d`, success `#1e5631` (Rich Emerald), border `#2a2a2e`.
  - Dark mode is a manually toggled `.dark` class on `<html>`, not OS-preference-driven.
- **i18n**: `next-intl`, cookie-based locale (not URL-prefixed for dashboards/account; the plan's
  original intent to prefix storefront routes for SEO was not implemented — current routing is
  cookie-based everywhere, full stop — flag this as a divergence from the original plan if SEO
  matters later). RTL via `dir` attribute + Tailwind logical properties. **Known major gap**: the
  i18n *infrastructure* (locale switch, RTL mirroring, Cairo font, DB+cookie persistence) is fully
  correct and verified, but almost all page content since Phase 2 is hardcoded English JSX, not
  routed through `t('key')`/`en.json`/`ar.json`. This is a deliberate, logged decision (see
  BUILD_LOG.md "MAJOR GAP FOUND") to keep building rather than stop and retrofit ~150-250+ strings
  mid-build — it's the top item slated for the final report.
- **Money is always Prisma `Decimal`**, never `Float`, across every financial field.

---

## 4. Environment Quirks and Fixes

- **No Docker, no admin rights available** → local Postgres runs via the `embedded-postgres` npm
  package (a real Postgres binary, not PGlite/`prisma dev`, which failed with P1017 migration
  errors). Orchestrated by `concurrently` (`npm run dev` runs `node scripts/db-server.mjs` and
  `next dev` as co-processes, `--kill-others-on-fail`) rather than an OS-level detached daemon,
  which proved unreliable. `scripts/db-server.mjs` is idempotent — checks if Postgres is already
  up via a `pg` `Client` before starting — so it's safe to run standalone (`npm run db:start`) too.
  Full detail/unstick steps: memory file `betolla_local_postgres_setup.md`.
- **Windows-1252 default encoding breaks Arabic seed data** → the DB is explicitly created with
  `CREATE DATABASE ... WITH ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0`.
- **Next.js 16 renamed `middleware.ts` → `proxy.ts`** (exported function is now named `proxy`, not
  `middleware`) — already done correctly at `src/proxy.ts`. This is a framework breaking change,
  not a project quirk — see `AGENTS.md`'s standing instruction to check
  `node_modules/next/dist/docs/` before assuming any Next.js API matches training data.
- **`prisma migrate dev` refuses to run non-interactively** when a migration needs confirmation
  (e.g. a new unique constraint). Workaround used twice so far: `prisma migrate diff --script` to
  generate the SQL by hand, place it as a migration file, then `prisma migrate deploy`.
- **`prisma migrate reset` has an AI-agent safety block** (Prisma's CLI detects agent invocation
  and requires a human-set env var). This was correctly **not** bypassed. When a full reset was
  needed, the workaround was manual `TRUNCATE` + `prisma db seed` instead — reuse this pattern, do
  not try to force `migrate reset`.
- **Local file storage risk — investigated, resolved as a genuine non-issue for the confirmed
  target**: uploaded images go to `/public/uploads/...` via `src/lib/server/storage.ts`
  (`saveUploadedImage`/`getFileUrl`/`deleteUploadedImage`, using `sharp`). This only works on a
  persistent filesystem host; on a read-only-bundle serverless target (Vercel-style) it would fail
  loudly (500 on every upload, `mkdir`/`writeFile` throwing against a read-only deploy bundle); on
  an ephemeral-but-writable-disk/multi-replica target (e.g. Render without its paid Persistent Disk
  add-on) it would fail silently later (image serves right after upload, vanishes on
  redeploy/restart/different replica). **Confirmed with the user (2026-07-23) the actual production
  target is Hetzner Cloud, a self-managed Ubuntu VPS** — see the new §4a below for full reasoning
  and what that target still needs before it's production-ready. No storage-provider swap was
  implemented or is needed for this target; the proposed swap (S3/Cloudinary behind the same
  three-function interface) was scoped but not built, and should only be revisited if the hosting
  target itself ever changes away from a persistent-disk VPS.
- **Turbopack stale route-group manifest**: rapid dev-server restarts can 404 a route that
  obviously exists on disk (hit this with `(auth)/login`). Fix: delete `.next` and restart before
  debugging the code itself.
- **Browser-tool console log accumulates per-tab for its whole lifetime** across navigations — a
  stale error from three pages ago can look like a live bug. Always verify anything suspicious in
  a brand-new tab, not a long-lived one.
- **One-off dev-server crash on `/api/uploads` with a real file, not reproduced**: during Bundles
  verification, the very first image upload (a synthetic 1x1 test PNG) killed the entire `npm run
  dev` process (`ERR_CONNECTION_RESET`, both the Next.js and embedded-postgres child processes died
  together via `concurrently`'s `--kill-others-on-fail`). Isolated `sharp` processing of the
  identical image buffer outside the server succeeded instantly, and a clean server restart +
  identical retry uploaded successfully (200) with no recurrence. Likely a Turbopack dev-server
  hiccup rather than an `/api/uploads` or `sharp` bug given it didn't reproduce, but flagging since
  a crash killing both processes together is a rough failure mode — if this recurs, capture the
  server's stderr at the moment of crash (not just after) to get a real stack trace.
  - **Distinct from, not the same bug as, the zero-part-`FormData` crash** found during the Phase 7
    self-check (§2a) — that one was reliably tied to a genuinely empty body (never a real file) and
    has since been root-caused and fixed with a pre-parse header guard in
    [src/app/api/uploads/route.ts](src/app/api/uploads/route.ts) (see §2a for the fix and
    verification). This real-file, single-occurrence incident remains unexplained and unreproduced —
    the fix below doesn't address it since a real file always has a non-zero, well-formed body and
    passes the new guard straight through, exactly as before.
- **`npm run dev` fails with `FATAL: lock file "postmaster.pid" already exists` and/or Next.js
  falls back to port 3001** (hit again 2026-07-23): `scripts/db-server.mjs`'s idempotent `isUp()`
  check only skips starting a *new* Postgres if it can actually connect to one that's already
  healthy — it does not help if the data directory (`.pgdata`) is left with a stale lock from an
  **unclean** shutdown, which real Postgres refuses to start over even when nothing is actually
  listening, to protect against two postmasters sharing one data directory. Confirmed two distinct
  ways this happens, both landing on the same symptom:
  - **A dev server from an earlier session/turn was simply left running** (not a crash at all) —
    `netstat -ano` showed the exact PID named in the Postgres error message still genuinely
    `LISTENING` on 5433, and the matching Next.js process still on 3000. Fix: stop that process,
    don't just delete files.
  - **A genuinely dead/orphaned lock** (real crash, or a force-kill that didn't clean up) — the PID
    in `.pgdata/postmaster.pid` no longer exists in the process list at all.
  - **Recovery, in order** — safe to run whenever this symptom appears, regardless of which of the
    two above caused it:
    1. `netstat -ano | findstr :3000` / `:5433` (or `grep` under Git Bash) to find what's actually
       listening.
    2. Check whether that PID is alive (`Get-Process -Id <pid>`, PowerShell). If alive, stop it
       properly (see the next point about `/T`) rather than deleting anything — it's a real
       running server, not a stale artifact.
    3. If the PID is dead, the lock file is genuinely stale: delete
       `.pgdata/postmaster.pid` directly and restart — no need to hunt further for a process that
       no longer exists.
  - **`taskkill /F` on the top-level `postgres.exe` PID without `/T` leaves orphaned children that
    keep the port open** — embedded-postgres spawns worker subprocesses (e.g. an `io_worker` child)
    that do **not** die with a plain `taskkill /F <pid>` on the parent alone, and one of those
    children keeps 5433 bound even after the parent is confirmed gone. Always include `/T` (kill
    the whole process tree) when force-stopping this project's Postgres, or check
    `Get-CimInstance Win32_Process | Where-Object ParentProcessId -eq <pid>` for leftover children
    afterward. A stray `postmaster.pid` reappearing immediately after you thought you'd removed it
    is the tell that a child is still alive and Postgres (or the next start attempt) re-wrote it.
  - Postgres logging "database system was interrupted... automatic recovery in progress" on the
    next clean start after any of the above is normal and expected, not a separate problem to fix.

### 4a. Deployment Target (Production)

**Confirmed (2026-07-23): Hetzner Cloud, a self-managed Ubuntu VPS** — not a serverless target,
not a managed PaaS. This is the direct reason the local-file-storage risk above is closed out as a
genuine non-issue, not a conditional one:

- A standard Hetzner Cloud VPS gives you a normal, persistent local disk **by default** — no
  "persistent volume" add-on, no special configuration, unlike Render (whose base plan has an
  ephemeral container filesystem unless you explicitly attach and pay for its Persistent Disk
  add-on) or a serverless target like Vercel (whose deploy bundle is read-only at runtime, full
  stop). Self-managed also means *you* control the deploy process, so nothing wipes `/public` or
  the disk in general unless you build a deploy step that does — a standard "git pull, restart the
  process" deploy does not touch existing files on disk.
- This means `src/lib/server/storage.ts`'s current local-filesystem implementation
  (`saveUploadedImage`/`getFileUrl`/`deleteUploadedImage`) needs **no change** for this target.
  The S3/Cloudinary swap that was scoped (not built) when investigating this only matters if the
  hosting target ever changes to something serverless or ephemeral-disk — it does not apply here.

**Self-hosting on a bare Ubuntu VPS also means none of the following exists yet — none of it has
been built or configured, and none of it should be, until a future session deliberately takes on
deployment work. Recorded here purely so that session starts with the right checklist instead of
rediscovering it from scratch:**
- **Process manager** — nothing keeps the Node.js app running today. Needs a systemd service (or
  pm2) so it restarts automatically on crash or server reboot. The current `npm run dev`
  (`concurrently` + embedded-postgres + Turbopack) is a dev-only setup, not a production process
  model, and was never intended to be one.
- **Reverse proxy** — nothing terminates TLS or serves on ports 80/443 today. Needs Nginx or Caddy
  in front of the Next.js process.
- **Firewall** — needs configuring so only necessary ports (SSH, 80/443) are open. Nothing
  configured yet.
- **Production Postgres — explicitly not `embedded-postgres`**: the `embedded-postgres` setup
  described earlier in this section was chosen specifically as a local-dev workaround for an
  environment with no Docker/admin rights. It is **not** what should run in production. Whether
  production Postgres runs self-managed on the same VPS or as a separate managed service is a
  distinct decision for a future session — not resolved here, not assumed.
- **Backup strategy** — a Hetzner VPS disk is persistent (survives reboots and ordinary deploys)
  but is **not automatically backed up**. Both the Postgres data and the `public/uploads/`
  directory need an explicit backup plan (e.g. Hetzner's own snapshot/backup product, or a
  scripted `pg_dump` + off-server file sync) before this holds real customer data.

---

## 5. Test Results So Far

- **Phase 3 (Auth/RBAC)**: verified **manually in-browser**, not via an automated suite — logged in
  as all 4 seeded roles, confirmed each redirects to its own dashboard, confirmed URL-guessing into
  another role's route group redirects away (via `proxy.ts` + `requireRole()`), and spot-checked
  object-level ownership (one customer can't fetch another's order by ID). No regression test
  script exists for this as its own dedicated pass, but the Phase 7/8/9 self-checks below
  re-exercise the same guards, repeatedly, across dozens of routes and all 4 roles plus
  logged-out — so this is no longer just a Phase-3-era snapshot in practice, even without a formal
  automated suite (see §6 for that gap).
- **Phase 5 (Storefront)**: full live walkthrough as seeded customer "Sara" — browse → product
  detail → add to cart → login → checkout with an already-used promo code (correctly **rejected**
  by the usage-limit check) → COD order placed (confirmed `PENDING`/`UNPAID`, stock decremented
  55→54) → mock-card order placed (confirmed `PAID` immediately, +10 loyalty points, `CustomerStats`
  recomputed) → wrote a review on a delivered item (confirmed DB row + product
  avgRating/reviewCount recalculated 2→3 reviews, 4.7 avg). **Still not exercised**: a live bundle
  purchase (bundle detail page reviewed, but checkout has only ever been run against regular
  products — same code path, treated as low risk but genuinely unverified; this includes the
  Phase 10 checkout re-verification, which also used a regular product).
- **Phase 6 (Account Hub)**: full live walkthrough as Sara — order tracker timestamps correct,
  real return request submitted (DB-confirmed), real address added via an actual OpenStreetMap tile
  click (DB-confirmed real lat/lng, not placeholder text), notification preference toggle
  DB-confirmed, support ticket reply DB-confirmed with correct status transition.
  A found-and-fixed bug from this pass: seeded timestamps could land in the future relative to
  "today" (fixed via a `clampToNow()` helper + raised minimum order age to 4 days; reseeded,
  verified 0 future-dated rows across 4 tables).
- **Phase 7 (Admin Dashboard) — complete, self-checked, fully verified.** Every section (Orders,
  Staff, Products, Bundles, Promo Codes, Store Credit/Users, Support Inbox, Settings, Abandoned
  Carts, CSV Export) is now built and was verified live in-browser this session; full detail and
  every individual walkthrough is in §2a. Headline results:
  - The user-mandated ownership self-check (staff-creation/promo-code/store-credit endpoints
    rejecting non-Admin roles) **ran and passed** — 15 `ADMIN`-only and 7 `ADMIN|STAFF` routes
    tested against all 4 roles plus logged-out, all correct.
  - The full-phase verification pass **found and fixed a real password-hash-exposure bug**: full
    `User` rows, including `passwordHash`, were reaching the browser via an unfiltered Prisma
    query on the order-detail page and via two admin/staff API routes. Fixed in all three places
    and confirmed via direct re-checks. Full writeup in §2a.
- **Phase 8 (Staff Dashboard) — complete, self-checked, fully verified.** Built from scratch this
  session (Orders/Products reusing Phase 7's shared components, plus the Staff-only
  create-Delivery-account flow). The ownership self-check confirmed the deliberate
  Admin-cannot-create-Delivery-accounts asymmetry. Full walkthrough and self-check results in §2b.
- **Phase 9 (Delivery Dashboard) — complete, self-checked, fully verified.** Built from scratch
  this session. The comprehensive privilege-chain self-check the user asked for specifically here
  (more thorough than Phase 7/8's) **ran and passed**, including cross-driver object-level
  ownership (independently confirmed in the DB, not just the HTTP response) and a cross-phase
  regression sweep confirming nothing built in Phases 8/9 loosened anything from Phase 7. This
  phase is also where a real Leaflet/SSR crash was found and fixed. Full detail in §2c.
- **Phase 10 (Notifications wiring) — complete, fully verified.** All 6 trigger points confirmed
  by checking the actual `Notification` rows created in the DB for each one (not just "no console
  error," since these triggers have no dedicated UI feedback of their own). Also where a real,
  previously-invisible bug was found and fixed: the cart's DB-sync endpoint had been silently
  404ing since it was built, meaning abandoned-cart tracking had never actually worked outside of
  seed data. Full detail in §2d.
- **Phase 11 (Deep analytics) — complete, fully verified.** RFM segmentation, frequently-bought-
  together, lifetime value, and the sales heatmap all confirmed against real seeded data, in both
  light and dark theme (screenshotted). Full detail in §2e.
- **Phase 12 (Polish pass) — complete.** Confirmation-modal audit found and fixed one real gap (an
  unconfirmed hard-delete on the wishlist "Delete list" action); RTL QA found and fixed a real
  bidi bug affecting phone numbers in 5 places app-wide; responsive QA and the docs pass found no
  issues needing a fix. Full detail in §2f.

---

## 6. Known Issues, Stubs, and Half-Finished Work

Everything that was an open stub, a wire-later item, or an unstarted section as of the last
mid-build update is now built and verified — see §2a-§2f for exactly what replaced each one (the
Bundles unverified-code state, the Phase 8/9 placeholders, the 404'ing nav links, etc. are all
resolved). What follows is the current, accurate list of what's genuinely still incomplete,
deferred, or imperfect in the shipped build.

**Gap flagged prominently since early in the build, still not fixed (deliberate, not an oversight):**
- **i18n content-translation coverage** — see §3's last bullet. The i18n *infrastructure* (locale
  switch, RTL mirroring — including the Phase 12 phone-number bidi fix, Cairo font, DB+cookie
  persistence) is fully correct and verified end-to-end. But almost all page content across the
  entire app — storefront, account, admin, staff, delivery alike — is still hardcoded English
  JSX, not routed through `t('key')`/`en.json`/`ar.json`. Switching to Arabic correctly flips
  direction and mirrors layout, but not the words. This was a deliberate call made early in the
  build to keep building rather than stop and retrofit ~150-250+ strings, and it was never
  revisited — it's the single largest gap between what this app *does* and what it looks like to
  an actual Arabic-speaking user.

**Deliberate scope/design decisions worth the user's attention (not bugs):**
- **No customer-facing notification inbox.** Phase 10 wires real triggers and writes real
  `Notification` rows, correctly gated by channel/category preference — but there is nowhere in
  the UI (customer, staff, or admin) to actually browse them. "Wire the trigger points" was built
  exactly as asked; a notification-viewing surface was never part of that ask. `.env.example`'s
  `NEXT_PUBLIC_APP_URL` is scaffolded for a future "link back to the order" use case that has no
  consumer yet either.
- **Abandoned-cart recovery is admin-triggered, not automatic.** There's no cron/scheduled-job
  runner anywhere in this codebase, so a cart can't be proactively nudged after N days idle — an
  admin has to open `/admin/abandoned-carts` and click "Send Reminder" per cart, per §2d.
- **Customer Lifetime Value is historical** (realized spend to date), not a predictive forecast —
  see §2e. A forward-looking formula would need a retention-period assumption this app has no real
  basis for; a fabricated multiplier would look more rigorous than it actually is.
- **Delivery driver earnings = the order's shipping fee, paid in full**, credited on `DELIVERED`
  only — see §2c. Chosen so the existing Shipping Zones admin UI doubles as the earnings "config"
  (one lever, not two) and because it needed zero schema changes. A percentage-of-fee commission
  model was the simpler alternative not built.
- **No automated test suite** (no Jest/Playwright harness). All verification across every
  phase — Phase 3 through Phase 12 — was live, manual, in-browser (or via direct `fetch()`/DB
  queries from a scratch script), not a repeatable CI-run suite. Thorough for what it covered, but
  nothing guards against a future regression automatically.
- **Local filesystem image storage — confirmed a genuine non-issue, not merely deferred.** Flagged
  since Phase 7 (§4) as a risk on serverless/ephemeral-disk targets. **Confirmed with the user
  (2026-07-23) the actual production target is Hetzner Cloud, a self-managed Ubuntu VPS** — a
  standard VPS disk is persistent by default (no add-on, no special config, unlike Render's base
  plan or a serverless target), so the current local-filesystem code needs no change. Full
  reasoning and the still-unbuilt deployment checklist (process manager, reverse proxy, firewall,
  production Postgres, backups) are in the new §4a.

**Not exercised this build, lower-risk but genuinely unverified:**
- A live bundle purchase through checkout (bundle detail page reviewed since Phase 5, but no
  checkout has ever been run against a bundle specifically — same code path as a regular product,
  treated as low risk, still unverified; see §5).
- The mock-card (immediately-`PAID`) checkout path wasn't re-run this session — Phase 10's
  end-to-end checkout re-verification used Cash on Delivery instead. The code path itself is
  unchanged since Phase 5, where it was last verified.
- A full return/refund flow (Phase 6 feature) wasn't re-touched this session.
- Reassigning a driver to a new `DeliveryAssignment` after marking one `FAILED`, end-to-end
  through the Admin/Staff UI — the individual pieces (the `FAILED` status update, and the
  pre-existing assign-driver route) were each verified separately this session, but never chained
  together in one live walkthrough.

---

## 7. Running the Project Locally

```bash
# One-time setup
npm install
cp .env.example .env         # then fill in JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:start             # starts the embedded Postgres binary standalone (idempotent)
npm run db:migrate           # prisma migrate dev
npm run db:seed              # prisma db seed - populates all demo data, prints credentials

# Day to day
npm run dev                  # runs DB + Next.js dev server together via `concurrently`
npm run db:studio            # prisma studio, if you need to inspect data directly
```

DB connection (matches `scripts/db-server.mjs`'s provisioning — only change together):
`postgresql://postgres:postgres@localhost:5433/betolla?sslmode=disable`

**Seeded login credentials** (all non-admin accounts share one password):
- Password for every non-admin account: `Betolla123!`
- Admin: whatever `ADMIN_EMAIL`/`ADMIN_PASSWORD` are set to in your `.env` (not a fixed value —
  read from env at seed time, never hardcoded, never exposed in any UI)
- Staff: `lina.haddad@betolla.com`, `omar.nassar@betolla.com`, `rania.qassem@betolla.com`
- Delivery: `khaled.fares@betolla.com`, `ahmad.salameh@betolla.com`, `yousef.zeidan@betolla.com`, `mahmoud.attia@betolla.com`
- Customers (20 seeded): e.g. `sara.khoury@example.com` (the one most manual testing has used so
  far), `nour.abdallah@example.com`, `farah.odeh@example.com` — full list in `prisma/seed-data/people.ts`

---

## 8. Build Status & Recommended Follow-Ups

**The build is complete through Phase 12.** Every phase from 0 through 12 is built, and Phases 7,
8, and 9 each had their mandated ownership/privilege self-check run against real roles and real
data (all passed — see §2a-§2c and the summary in §5). Every bug found along the way during
verification was fixed, not just logged (see §5/§6 and each phase's §2a-§2f breakdown for
specifics). The final consolidated report — everything built/verified, every failure or gap
found, environment risks, and a risk-prioritized manual test list — was delivered directly to the
user in-chat at the end of this session; this file is its full supporting detail.

There is no in-progress work and no required next step to finish this build. What follows is
recommended **future** work — a prioritized wishlist for a later session, not a continuation
queue:

1. **i18n content coverage** — route the ~150-250+ hardcoded English strings through
   `next-intl`'s `t('key')`/`en.json`/`ar.json`, now that the RTL/locale infrastructure underneath
   them is fully verified (including the Phase 12 phone-number bidi fix). The single highest-value
   remaining gap for real Arabic-speaking users (§6).
2. **A notification inbox** — a UI surface (customer-facing at minimum; possibly an admin-side
   "sent log" too) to actually browse the `Notification` rows Phase 10 now writes correctly (§6).
3. **An automated test suite** — even a thin Playwright smoke-test layer over the ownership/
   privilege matrix this session's self-checks exercised by hand would let future changes catch
   regressions without re-deriving this session's manual sweeps from scratch (§6).
4. **Revisit the CLV and delivery-earnings formulas** if the deliberately-simple choices made this
   session (realized-spend-to-date CLV; shipping-fee-as-driver-pay) don't match what was actually
   wanted — both are flagged as judgment calls in §2c/§2e, not requirements handed down (§6).
5. **Scheduled/cron infrastructure**, if abandoned-cart recovery (or anything else time-based)
   should eventually run automatically rather than via an admin button click (§6).
6. ~~S3/Cloudinary-compatible image storage~~ — **not needed**: confirmed 2026-07-23 the production
   target is Hetzner Cloud (self-managed Ubuntu VPS), which has a normal persistent disk by
   default, so local-filesystem storage is fine as-is (§4/§4a). Only revisit if the target ever
   changes away from a persistent-disk VPS.
7. **Production deployment infrastructure for the confirmed Hetzner VPS target** — none of this
   exists yet (§4a): a process manager (systemd/pm2) to keep the app running and auto-restart on
   crash/reboot, a reverse proxy (Nginx/Caddy) for TLS and port 80/443, firewall rules, a real
   production Postgres instance (the current `embedded-postgres` is dev-only and explicitly not
   meant for production — where it runs is a separate decision), and a backup strategy for both
   the Postgres data and `public/uploads/` (a VPS disk persists but is not auto-backed-up).
8. Work through the "Not exercised this build" list in §6 (a live bundle purchase, the mock-card
   checkout path, a full return/refund flow, driver-reassignment-after-a-failed-delivery,
   end-to-end) — all lower risk, genuinely just unverified rather than suspected-broken.

---

## 9. Phase 13 (Theme fix, Delivery Support, mobile drawer nav, auto-hiding header, analytics)

Planned in full (investigation + design + 4 user-confirmed decision points) before any code was
written, per explicit instruction this session. **Items A, B, D, E, F below are complete and
verified live in-browser as the relevant roles, with real seeded data.** Item C (the i18n string
retrofit) is **not started** — see the explicit note at the end of this section; everything else
in this phase was built i18n-ready (new UI text is minimal and plain English, same as the rest of
the pre-Phase-13 app) so the retrofit can absorb it later without rework.

### 9a. Item A — Theme toggle fix

Root cause: `ThemeToggle` was never imported/rendered in `AdminNav`/`StaffNav`/`DeliveryNav` or
their layouts — a pure UI omission, not a state-sync bug (the cookie/DB/no-FOUC mechanism was
always global and correct). Fixed by adding `<ThemeToggle />` to the header of
`src/app/admin/layout.tsx`, `staff/layout.tsx`, `delivery/layout.tsx`, and (beyond the literal ask,
for 4-role consistency) `account/layout.tsx`. Verified as all 4 seeded roles: toggle renders,
`User.themePreference` updates correctly in the DB, persists across navigation/reload, zero
regression on the two pre-existing call sites (`StorefrontHeader`, `/account/preferences`).

### 9b. Item B — Delivery "Report a Problem" + Delivery Support queue

New `DeliverySupportTicket` model (+ `DeliveryProblemType`/`ReportUrgency` enums), deliberately
separate from `SupportTicket` (different queue, per the user) with a single `staffNote` field
instead of a message thread (confirmed with the user — lighter scope than the customer Support
Inbox). Driver side: `ReportProblemDialog` (from an active delivery or the general "My Reports"
entry point), `/delivery/reports` list + read-only `[id]` detail. Admin+Staff side: shared
`src/components/delivery-support/*` components (Filters/List/Controls), `/admin/delivery-support`
and `/staff/delivery-support` pages, new nav links, new "Open Delivery Reports" KPI tile on both
dashboards. Upload pipeline generalized: `saveUploadedImage`'s subfolder is now a named
`UploadSubfolder` type, `/api/uploads` allows `DELIVERY` sessions and **forces** their uploads into
`delivery-reports/` server-side regardless of what the client requests (verified: an explicit
`subfolder:"products"` spoof attempt from a Delivery session still lands in `delivery-reports/`).
No notification wiring was added (`notify()` is already a no-op for every Staff/Admin/Delivery
account today — confirmed directly, `createManagedAccount()` and the seed script's preference loop
never populate `NotificationPreference` rows for non-customer roles — so this matches the sibling
Support Inbox's own precedent, not a new gap).

Full verification: filed reports with/without a linked delivery, the "Other" + required-description
validation (client and server), a real photo upload confirmed landing in
`public/uploads/delivery-reports/`, status/assign/note updates confirmed via direct DB reads and
`ActivityLog` rows, and a full ownership/role sweep (wrong driver → 404, Customer → 403/404 on
every new route, logged-out → 401) matching the Phase 7-9 self-check style. All test data cleaned
up afterward.

**Two real environment issues hit and resolved during this item, worth remembering:**
- `prisma migrate dev` did **not** auto-run `prisma generate` in this environment/config — the
  running dev server kept a stale Prisma Client module without the new
  `deliverySupportTicket` delegate until `npx prisma generate` was run explicitly and the dev
  server was restarted (with `.next` cleared, per the existing Turbopack-stale-cache lesson in §4).
  Run `prisma generate` explicitly after any schema migration, don't assume `migrate dev` covers it.
- A recurrence of the previously-logged "one-off dev-server crash on `/api/uploads` with a real
  file" (§4): the dev server died completely (not just a request-level 500) while testing the new
  DELIVERY-role upload path. Investigated properly this time — ran the dev server directly via a
  logged background process and hit the endpoint with curl (25 consecutive real-file uploads, zero
  failures) and then again via the browser (10 more, zero failures) once the server was stable.
  Confirmed non-reproducible and unrelated to the new code — consistent with this being the same
  pre-existing Turbopack/dev-server flakiness already documented in §4, not a regression.

### 9c. Item D — Mobile hamburger + drawer

New `src/components/ui/Drawer.tsx` (Radix Dialog under the hood, same construction as `Dialog.tsx`)
— edge-anchored via logical properties (`start-0`, `border-e`) so it correctly anchors left in LTR
and right in RTL, slide+fade via Tailwind's stock `data-[state]` transition utilities, swipe-to-close
via hand-rolled touch handlers. Wired into all 4 nav components (`AccountNav`/`AdminNav`/`StaffNav`/
`DeliveryNav`): the existing pill-strip is now `hidden sm:flex` (desktop-only, unchanged), replaced
below `sm:` by a hamburger trigger + the new drawer. `AccountNav`'s drawer additionally includes
`LogoutButton`.

**Real bug found and fixed while verifying this**: the new `rtl` custom-variant comment added to
`globals.css` contained a literal `*/` inside the comment text itself (`ms-*/me-*/...`), which
prematurely closed the CSS comment and made the rest unparseable — PostCSS/Turbopack failed to
compile `globals.css` at all, breaking **every** page in the app (a `500` on every request) until
fixed. Caught immediately via testing (a fresh login attempt 500'd) rather than assumed to be
unrelated flakiness — a good reminder to verify new CSS comments don't accidentally contain `*/`.

Verified: drawer open/close via trigger click, Escape, backdrop-click, and link-click (which both
navigates and closes); LTR anchors left (confirmed via an Admin/EN-locale session, `left: 0px`) and
RTL anchors right (confirmed via Sara Khoury's real seeded AR-locale account, `dir="rtl"`, drawer
rendered on the right edge as expected); desktop (`sm:` and up) confirmed unchanged — hamburger
`display:none`, sidebar `display:flex`. **Swipe-to-close could not be exercised** — this browser
automation environment has no real touch-drag simulation — flagged as a real-device verification
gap, not silently assumed to work; the reliable close paths (button/Escape/backdrop/link) are all
confirmed working regardless.

### 9d. Item E — Storefront auto-hiding mobile header

New `src/hooks/useScrollDirection.ts` (plain scroll listener, hides only when scrolling down past
an 80px near-top threshold, reveals instantly on any upward scroll). Wired into
`StorefrontHeader.tsx`'s `className` only — the component itself, and `useCartSync()`'s mount,
are completely untouched.

**Real Tailwind v4 finding, worth remembering for any future responsive work in this codebase**:
the originally-written `max-sm:-translate-y-full` variant **generated no CSS at all** in this
project's Tailwind v4 setup — confirmed by searching the actual generated stylesheet for the class
and finding nothing. `max-sm:`-style max-width variants are not available here (unclear whether
that's this Tailwind v4 version/config specifically, but empirically confirmed absent). Fixed by
switching to the standard mobile-first pattern already used everywhere else in this codebase:
unprefixed classes as the mobile default, `sm:` prefixed classes as the unconditional override —
never reach for `max-sm:` in this project, it doesn't generate CSS.

**Second finding**: Tailwind v4's `translate-x-*`/`translate-y-*` utilities set the standalone CSS
`translate` property, **not** `transform` (a Tailwind v4 change from v3's behavior) — `getComputedStyle(el).transform`
will read `"none"` even when a translate utility is correctly applied; check `getComputedStyle(el).translate`
instead. `transition-transform` does correctly cover this (`transition-property: transform, translate, scale, rotate`),
so animations work correctly — this only affects how you *verify* the applied style, not the actual behavior.

Verified: continuous simulated downward scroll past the threshold hides the header
(`translate: 0px -100%`, confirmed both via computed style and a screenshot showing product cards
filling the whole viewport with no header); scrolling up reveals it immediately; desktop width
(1280px) keeps it visible regardless of scroll position (`translate: 0px`, confirmed after
scrolling 500px down). Search/cart/account controls unaffected.

### 9e. Item F — Analytics expansion

Five new sections added to `/admin/analytics`, extending `src/lib/server/services/analytics.ts` in
place (kept as one file, not restructured, per the existing Phase-11 convention): **Staff
performance** (leaderboard `BarChart` + a per-staff-member `LineChart` timeline drill-down, sourced
from `OrderStatusHistory.changedById` rather than `ActivityLog`, since that field is purpose-built
for "which staff member advanced this order" and `ActivityLog` mixes in unrelated action types);
**Delivery performance** (per-driver delivered/failed-rate/on-time-rate/avg-delivery-time; "on-time"
is explicitly defined as delivered within a flat 24h-of-assignment threshold, stated as such rather
than an unlabeled "on-time %", per the user's confirmed choice; failed-reason breakdown reads the
new `DeliverySupportTicket.problemType` structured enum from item B, not the free-text
`DeliveryAssignment.failedReason`); **Cohort retention** (signup-month cohorts × months-since-signup
% still ordering, using `date-fns` — installed but previously unused anywhere in this codebase —
for correct calendar-month arithmetic); **Cart abandonment funnel** (confirmed-with-user scope:
users-with-a-cart → users-who-ordered → users-who-paid, using only what's really trackable today,
plus the recoverable-revenue total reusing `/admin/abandoned-carts`'s exact data source); **Geographic
order distribution** (a sorted table of the 7 fixed shipping cities, confirmed-with-user choice over
a Leaflet map). A shared `AnalyticsDateRangeFilter` (URL-param `from`/`to`, the same `setParam`
convention used elsewhere) applies to all 5 new sections only — the 4 existing Phase-11 widgets are
explicitly left date-range-agnostic, unchanged. Period-over-period deltas (vs. the immediately
preceding equal-length window) show on the staff leaderboard, delivery-performance rates, and the
cart funnel; deliberately not added to the cohort heatmap (already inherently multi-period) or the
geographic table.

**Real correctness bug found and fixed while verifying this**: the cart funnel's first draft
compared raw `Cart.count()` against raw `Order.count()` — since `Cart` is a one-row-per-user
singleton (`userId @unique`) while a single user can place many `Order` rows over time, this
produced a nonsensical "3640% conversion" between stages the first time it was tested live. Fixed
by counting **distinct users** at every stage (`Cart` count already is distinct-user since the
unique constraint; `Order`/paid-`Order` now use `findMany({distinct:["userId"]})` instead of a raw
row `count()`), and relabeled the stages honestly ("Users with a cart" / "Users who placed an
order" / "Users who paid") to reflect what's actually being counted. A residual >100% figure can
still appear between "users with a cart" and "users who ordered" on this specific seeded dataset —
that's a real characteristic of the seed data (most historical seeded orders predate the Phase-10
cart-sync fix and were never associated with a real synced `Cart` row), not a remaining query bug.

Verified: all 4 existing widgets render unchanged (regression check); all 5 new sections render
with real seeded data; the date-range filter narrows results and produces correct period-over-period
deltas (spot-checked); dark mode screenshot confirmed correct (RFM chart's health-spectrum colors
still correct, layout intact at mobile width alongside the new drawer nav).

### Not done this session — explicitly remaining

- **Item C (i18n string retrofit) was not started.** `PROGRESS.md` §6's ~150-250-string gap is
  unchanged. All new UI text authored in items B/D/E/F this session is plain hardcoded English,
  same as the rest of the pre-existing app — nothing new was added to the `en.json`/`ar.json`
  catalogs, and no `t()` calls were introduced anywhere. Two small reusable pieces were built ahead
  of the retrofit and are ready to be consumed once it starts: `src/lib/format.ts`
  (`formatCurrency`/`formatDate`, locale-aware, not yet wired into any call site) and
  `src/components/Money.tsx`/`FormattedDate.tsx` (bidi-isolated wrappers for the eventual price/date
  retrofit) and `src/lib/cityAr.ts` (the `CITY_AR` lookup for the city-name gap noted in the
  original i18n investigation). The full retrofit — namespace population, ~150-250 real Arabic
  translations, ICU plural handling, and a post-retrofit RTL re-QA pass — remains a large,
  standalone piece of future work.
- Swipe-to-close on the new mobile drawer (§9c) is unverified on a real touch device.
