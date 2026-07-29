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

- **Item C (i18n string retrofit) was not started in this session** — see §10 below for the full
  retrofit, completed in the next continuation session.
- Swipe-to-close on the new mobile drawer (§9c) is unverified on a real touch device.

---

## §10 — Phase 13 continuation: dev-server fix, theme-toggle re-check, and the full i18n retrofit

A follow-up session picked up exactly where §9 left off, in the order requested: (1) diagnose and
fix the dev-server startup issue, (2) investigate the "2 Issues" dev-tools badge, (3) re-check the
theme toggle, then (4) build the entire i18n retrofit deferred at the end of §9.

### 1 — Dev server port/lock conflict, root-caused

Symptom: `npm run dev` failed with `FATAL: lock file "postmaster.pid" already exists ... Is another
postmaster (PID nnnnn) running?`, and Next.js silently fell back to port 3001.

Root cause (confirmed via `Get-CimInstance Win32_Process` command-line inspection, not assumed): a
dev server from an earlier turn in the *same* session was still running in the background —
genuinely running, not a crash artifact. Fix required two steps because of a Windows-specific
gotcha: `taskkill //PID <postgres-pid> //F` **without** the `/T` flag killed the parent
`embedded-postgres` process but left an orphaned `io_worker` child process still holding port 5433.
That child had to be found and killed separately (with `/T`) before the now-genuinely-stale
`.pgdata/postmaster.pid` file could be safely removed and `npm run dev` restarted cleanly.

**New environment gotcha for future sessions** (same category as the existing Turbopack-stale-
manifest and dev-server-crash notes in §4): if `postmaster.pid` conflicts occur, check whether a
process is actually listening on the expected port before assuming the lock file is stale — killing
a *live* Postgres out from under a running dev server is a worse outcome than leaving it alone. On
Windows, always force-kill embedded-postgres with `taskkill /F /T` (both flags) — omitting `/T`
reliably leaves an `io_worker` child holding the data directory lock.

### 2 — "2 Issues" dev-tools badge investigated

This was the Next.js Dev Tools indicator (`<nextjs-portal>` shadow-DOM element,
`.dev-tools-indicator-issue-count`), not an application bug. At the time of inspection it reported
zero real issues and was unrelated to item 1's crash. Separately, a console warning ("Encountered a
script tag while rendering React component") was re-tested across multiple genuinely fresh tabs
(ruling out this project's own documented stale-per-tab-console gotcha) and confirmed real and
reproducible on every page — traced to the root layout's pre-existing no-FOUC theme script
(`<script dangerouslySetInnerHTML>` in `src/app/layout.tsx`, present since early build phases).
Functionally harmless (the whole point of that script is to run before hydration), reported
honestly rather than "fixed" since it isn't actually broken and predates this session.

### 3 — Theme toggle re-checked, no code bug found

The user reported the toggle's icon represents the *current* theme rather than the theme a click
would switch *to*. Live empirical testing (checking `document.documentElement.classList.contains
("dark")` against which SVG actually rendered, across multiple reloads) confirmed the logic was
**already correct**: dark mode shows a sun icon (switch to light), light mode shows a moon icon
(switch to dark) — this is the same fix already shipped in §9. Explicitly did not "fix" already-
working logic based on the reported premise. The one real gap found: `ThemeToggle.tsx` had no
visible text label at the time, only an `aria-label` — a plausible explanation for the reported
confusion. (A visible label was added during this pass; see the retrofit section below for the
follow-up bug where that label's text turned out to be hardcoded and was fixed properly.)

### 4 — Item C: the full i18n retrofit

Built in five batches, in the order specified: infrastructure → storefront/auth → account hub →
admin dashboard → staff + delivery dashboards, followed by a dedicated live-QA + RTL re-verification
pass across all 4 roles in both languages. See `I18N_AR_REVIEW.md` for every register/ICU-plural/
numeral-convention choice flagged for native-speaker review, organized by the same batches below.

**Batch 4a — Infrastructure + storefront/auth.** Reorganized `en.json`/`ar.json` from the original
3 flat namespaces (21 keys) into namespaces mirroring the app's route groups (`common`, `theme`,
`language`, `nav`, `storefront`, `account`, `admin`, `staff`, `delivery`, `auth`, `toast`, `errors`).
Built `src/lib/format.ts` (`formatCurrency`/`formatDate`, locale-aware via an `-u-nu-latn` numbering-
system override so `ar-JO` renders Western digits, matching the documented convention rather than
`ar-JO`'s Arabic-Indic default), `src/components/Money.tsx`/`FormattedDate.tsx` (bidi-isolated
`dir="ltr"` wrappers), and `src/lib/cityAr.ts` (`CITY_AR` lookup + `localizedCity()` for the
`ShippingZone.cityAr`-exists-but-unused gap noted in the original investigation). Fully migrated:
storefront header/footer/home/products/product-detail/reviews/bundles/cart/checkout/confirmation,
and both auth pages (login/register), including converting `registerSchema`/`loginSchema` zod
messages to i18n key-paths translated at render time via `tErrors(errors.field.message)`.

**Batch 4b — Account hub.** All ~20 files across orders (list/detail/reorder/return-request),
wallet, addresses (incl. `localizedCity()` in both the saved-address display and the city
`<select>`), wishlists, preferences, sessions, support (list/detail/new-ticket/reply), and change-
password (incl. converting `changePasswordSchema` to the same key-path convention). New
`src/lib/supportCategories.ts` (`SUPPORT_CATEGORIES` with `{value, key}` pairs) so a ticket's
category translates consistently between the New Ticket dialog and every place a ticket list/detail
displays it, while the value stored in the DB stays a stable English identifier. A verification
sweep after this batch caught two real gaps: the account-overview store-credit tile bypassing
`<Money>` (left as an intentional design choice after confirming the label already localizes its own
unit and digits are Western either way — not a bug) and `AddressFormDialog.tsx`'s default form value
`label: "Home"` never running through `t()` (fixed with a new `defaultLabelValue` key).

**Batch 4c — Admin dashboard (the largest single batch, 47 files).** Nav, dashboard home, Users
(list/filters/detail + `StoreCreditAdjustmentForm`), Orders (list/detail, plus the shared
`OrdersTable`/`OrderFilters`/`OrderStatusActions`/`OrderTracker` components — migrating these once
fixed the parallel Staff routes for free since they render the identical components), Products
(list/new/edit + shared `ProductForm`/`ProductRowActions`), Bundles (+ `BundleForm`/
`BundleRowActions`), Promo Codes (+ `PromoCodeForm`/`PromoCodeRowActions`), Settings (loyalty
config/tiers, shipping zones), Delivery Support (admin queue + the 3 shared `DeliverySupport*`
components), Support Inbox, Staff management (+ shared `CreateManagedAccountDialog`), Abandoned
Carts, and all 12 Analytics files. New shared enum catalogs added to `common.*` for reuse across
every role: `orderTracker`, `rfmSegment`, `promoSegment`, `paymentStatus`, `deliveryProblemType`,
`deliveryUrgency`, `roleLabel`. `src/lib/deliverySupport.ts`'s `PROBLEM_TYPE_LABEL`/`URGENCY_LABEL`
plain-English label maps were removed as dead code once every consumer was switched to the
`common.deliveryProblemType`/`deliveryUrgency` catalogs. For the Analytics batch specifically, two
service-layer changes were made (not touching any actual computed values/aggregation logic, only
how results are *labeled*): `getSalesHeatmap()` now returns `dayIndex`/block `key` instead of baked
English day-abbreviations and time-range strings (the UI localizes the weekday name via
`Intl.DateTimeFormat` off the index, and translates the time-block key), and
`getCartAbandonmentFunnel()`'s stage objects use a `key` instead of an English `label`. A
verification sweep after this batch caught one real gap (the admin-dashboard revenue tile bypassing
`<Money>`, same pattern as the account-hub one) — this time genuinely fixed, since the thousands-
separator benefit matters more for a total-revenue figure than a single customer's store credit;
the account-overview tile was updated to match for consistency.

**Batch 4d — Staff + delivery dashboards.** Staff: nav/layout/home, Orders/Products pages (thin
wrappers reusing the now-translated shared components — mostly just a heading string each),
Delivery Accounts (list/detail + `DeliveryAccountRowActions`, reusing `common.roleLabel` for the
shared `CreateManagedAccountDialog`), Delivery Support pages (reusing the `admin.deliverySupport.*`
keys directly, since the underlying component tree is identical). Delivery (driver): nav/layout/
active-deliveries/history/earnings, assignment detail (+ `DeliveryStatusActions`,
`ReportProblemDialog`), and My Reports (list/detail). Reused `account.orders.itemCount`'s existing
ICU-plural for the item-count string on the driver's active-deliveries list, and
`common.deliveryProblemType`/`deliveryUrgency` for the driver-facing report dialog — meaning the
driver-side "Report a Problem" flow (built in item B, earlier this phase) is now fully localized for
free as a side effect of the admin-batch enum-catalog work.

**Batch 4e — Live QA + RTL re-verification.** Logged in as all 4 seeded roles (Admin, Staff — Lina
Haddad, Delivery — Khaled Fares, Customer — Sara Khoury, whose seeded locale is already Arabic) and
walked every migrated page in both languages via the real dev server with real seeded data, not just
a static code read. Confirmed real Arabic renders throughout (not mirrored-layout-with-English-text-
still-showing), the RTL mobile drawer nav slides in from the correct "start" (right, in RTL) edge
with fully-translated content (`document.documentElement.dir === "rtl"` confirmed), and a wide range
of real ICU plural forms render grammatically correctly against actual seeded counts (e.g. 3 vs. 8
vs. 17 vs. 104 all selecting the right Arabic plural category). Also ran a dedicated background
sweep specifically for one bug class this pass surfaced (see below): messages containing an ICU
placeholder whose call site never supplies it — found and fixed the one real instance, confirmed no
others exist anywhere in the ~90 placeholder-bearing keys across the whole catalog.

**Real bugs found and fixed during live QA** (beyond what static code review / `tsc`/`lint` can
catch):

1. `auth.login.welcomeBack`/`auth.register.join` contain a `{brand}` ICU placeholder that
   `LoginForm.tsx`/`RegisterForm.tsx` never supplied — next-intl rendered the literal untranslated
   key path (`auth.login.welcomeBack`) on screen instead of throwing a build-time error, since this
   is a runtime-only formatting error. Fixed by passing `{ brand: tCommon("brand") }` at both call
   sites.
2. `ThemeToggle.tsx`'s aria-label and visible "Light"/"Dark" text were hardcoded English despite
   `theme.switchToLight`/`switchToDark`/`light`/`dark` keys already existing in the catalog since
   the very first infra batch — simply never wired up. Fixed.
3. `ConfirmDialog.tsx`'s `cancelLabel`/`confirmLabel` prop *defaults* and its "Working..." pending-
   state text were hardcoded English and silently active at nearly every call site in the app (no
   call site had ever passed an explicit `cancelLabel`). Fixed via `common.cancel`/`common.confirm`/
   a new `common.working` key, with the component now falling back to translated defaults instead of
   English ones when a caller doesn't override.
4. `admin/users/[id]/page.tsx`'s wallet-history section rendered `LoyaltyTransaction.type` (raw
   "EARN"/"REDEEM"/"ADJUSTED") when no `note` was set, instead of reusing the
   `account.wallet.txType.*` labels already built for the customer-facing wallet page. Fixed.
5. `src/components/ImageUploader.tsx` — all three exported components (`SingleImageUploader`,
   `GalleryUploader`, `ReportPhotoUploader`) were missed by every batch above; every button label,
   the "Uploading..." state, the "Upload failed" toast, and image alt text were hardcoded English.
   New `common.imageUploader.*` namespace added and wired into all three.
6. `src/components/MapPinPicker.tsx`'s map caption ("Click the map to drop a pin...") was hardcoded
   English; wired to `account.addresses.form.mapInstructions`.
7. `src/lib/server/services/wishlists.ts`'s `getOrCreateDefaultWishlist()` wrote the literal string
   `"My Wishlist"` into the database for every new customer's first wishlist, regardless of locale —
   a server-side default value, not a template string, so it was invisible to a component-level
   grep. Fixed to call `getTranslations("account.wishlists")` and use a new `defaultListName` key.
   Only affects wishlists created from this point forward; already-persisted wishlists (seeded or
   real) keep their existing English name — expected, not a data migration this pass is scoped to
   do.
8. `ar.json`'s `admin.analytics.salesHeatmap.timeBlocks.*` initially used Arabic-Indic digits
   (e.g. "١٢–٤ص"), breaking the project's established Western-digit convention (enforced everywhere
   else via `formatCurrency`/`formatDate`'s `-u-nu-latn` override). Fixed to Western digits
   ("12–4ص").

`tsc --noEmit` and `npm run lint` were run clean after every single file edited across all five
batches (dozens of checkpoints, not just at the end). Both `en.json`/`ar.json` were validated as
parseable JSON after every edit.

### 5 — Analytics date-range filter extended to all 9 widgets

The single `AnalyticsDateRangeFilter` (URL params `from`/`to`) was moved from its old position
(only above the 5 Phase-13 widgets) to sit directly under the page heading, so it now visually and
functionally governs the whole page. `analytics.ts` gained real range-aware query logic for the 3
of the original 4 widgets where a date window is a coherent question:

- `getTopCustomersByLifetimeValue(limit, range?)` — without a range, still reads the pre-aggregated
  `CustomerStats.totalSpent` (fast, matches the all-time figure shown elsewhere). With a range, it
  switches to a fresh `Order.groupBy` over PAID orders within the window instead (the pre-aggregate
  literally cannot answer "top spenders in June" - it only tracks all-time totals).
- `getFrequentlyBoughtTogether(limit, range?)` — added an `order: { createdAt }` filter to the
  `OrderItem` query.
- `getSalesHeatmap(range?)` — added the same `createdAt` filter alongside the existing `PAID` filter.

**RFM segment counts were deliberately left date-agnostic** and flagged rather than forced: a
segment (Champions/At Risk/Lost/etc.) is a whole-customer-lifetime label recomputed all-at-once by
the "Recalculate Segments" button, not a per-event fact with its own date - "Champions between
March 1-31" isn't a coherent question the way "top spenders in March" is. This is recorded as a
comment directly in `page.tsx` next to where the segment counts are fetched, not just here.

Verified live: filtering to June 2026 produces a completely different top-10 list (different
customers, different totals) and different frequently-bought-together/heatmap counts than the
all-time view - confirming this is real re-aggregation, not a UI-only filter over already-fetched
all-time data.

### 6 — Analytics page redesigned for density and weight

Per the explicit feedback that the page read as "childish" and "decorative" rather than something
"a serious business would rely on to make decisions" - a KPI strip, meaningful-only color, and a
density pass, without touching any computed values beyond what item 5 already required.

- **KPI strip** (new `KpiStrip.tsx`): 4 large single-figure tiles at the top - Total Revenue,
  At-Risk + Lost Customers, Open Delivery Reports, Recoverable Cart Revenue - each with a
  colored trend delta vs. the prior equal-length period when one is available (a "select a date
  range for a comparison" hint shows instead when the page is unfiltered, rather than a
  misleadingly blank space). Revenue rising and recoverable-cart-revenue falling are colored green;
  the reverse of each is colored red (`text-success`/`text-critical`, both defined in
  `globals.css` and already dark-mode-aware). The two count tiles (at-risk+lost customers, open
  delivery tickets) intentionally show **no delta** - both are point-in-time backlog snapshots, not
  period totals, so a "trend" for them would have to compare today's count to some arbitrary past
  count, which isn't the same kind of question as a period-over-period revenue change.
- **RFM section reworked** (new `RfmStatTiles.tsx`): leads with 3 actionable segment counts
  (Champions in green, At Risk and Lost in red/critical) before the existing full 7-segment bar
  chart, rather than making an admin read the whole chart to find the 3 segments that actually
  need action.
- **Trend deltas added to the original widgets where they're a genuinely different signal, not
  added where they'd just repeat the KPI strip**: Sales Heatmap gained a "N paid orders (+/-Δ vs
  prior period)" line above the grid (order *count* is a different signal from revenue *amount*,
  and the delta was free to compute - already had both periods' grids in hand for the heatmap
  itself). Top Customers by LTV and Frequently Bought Together were deliberately left without a
  page-level delta: both are ranked lists of distinct entities (individual customers, individual
  product pairs), not a single scalar that can meaningfully go up or down the way a total can -
  forcing a "combined top-10 spend" figure onto Top Customers would just re-derive a number close
  to (and confusable with) the Total Revenue KPI already at the top, for no real added insight.
  This mirrors the judgment already applied to the cohort heatmap and geographic table in the
  original Phase-13 build (some widgets are distributions/rankings, not trend-lines, and forcing a
  delta onto them doesn't make them more useful).
- **Density pass**: every analytics `Card` on the page now uses `rounded-lg` (down from the
  app-wide default `rounded-2xl`) and tighter `p-3.5` content padding (down from `p-5`), applied via
  className overrides on this page only (the shared `Card`/`CardContent` components and every other
  page using them are untouched). Chart heights were reduced (RFM bar chart 280px→200px, staff
  leaderboard 240px→180px, staff timeline 200px→140px) and the sales-heatmap/cohort-heatmap grid
  cells shrank (40px→32px height, tighter `border-spacing`, smaller corner radius) to fit more
  numbers on screen without scrolling, matching the requested Stripe/Linear-style density over the
  previous consumer-card-grid look.

No underlying data/query logic was touched beyond what item 5 required, per the explicit
instruction for this item - the density/KPI/RFM-tiles work is presentation-only, reusing the same
`analytics.ts` return values (plus the two new small aggregates, `getTotalRevenue()` and the
existing open-delivery-ticket count already used on the admin dashboard home page).

Verified live in both languages: KPI deltas color correctly (a real -1,204.970 JD revenue drop
in a filtered June-2026 test showed in red; the "no comparison available" hint shows correctly on
the unfiltered default view); RFM stat tiles show correct counts and colors in both light and dark
mode (`--critical` resolves to `#f87171` in dark mode as expected); the KPI grid reflows to 2
columns at mobile width; `tsc`/`lint` clean throughout.

### Not done this session — explicitly remaining

- The ~35 `metaTitle` keys scattered across the catalog (e.g. `account.orders.metaTitle`,
  `staff.deliveryAccounts.metaTitle`) are dead/unreferenced — every route in this app sets a static
  hardcoded-English `export const metadata` instead of calling `t("metaTitle", ...)`, a pattern
  established in the very first batch and kept consistent throughout. Only the two product/bundle
  `generateMetadata` functions actually consume a `metaTitle` key. Worth a cleanup pass to either
  wire these up for real (translating browser-tab titles) or delete the unused keys — deliberately
  left as-is this session since it's a pre-existing pattern decision, not a correctness bug.
- A native Arabic speaker has not reviewed any of the flagged items in `I18N_AR_REVIEW.md` (register
  choices, ICU plural forms, the RFM segment terminology, the sales-heatmap time-block numeral
  convention).

---

## §11 — Phase 14: Arabic content coverage, analytics fixes, staff support, delivery
collections/history, and product+delivery reviews

Six items, worked in order per the standing instruction (investigate → build → test → full
role/language QA → fix → re-test → move on), no check-ins between items. Three judgment calls were
resolved via direct questions before starting (all took the recommended default): Category stays
seed-only this phase (no admin CRUD built — flagged as a follow-up below); the analytics page's
black/vivid treatment applies **unconditionally**, independent of the site's light/dark toggle;
driver/delivery rating **was** built this phase (new field on `DeliveryAssignment`, not skipped).

### Item A — Arabic content coverage

**A1 — Product/category/bundle content.** Investigation found the schema and admin forms were
**already fully bilingual** (`Product`/`Category`/`ProductBundle` all have paired `nameEn`/`nameAr`
(+`descriptionEn`/`descriptionAr`) fields, already populated by seed data since they're
non-nullable; `ProductForm.tsx`/`BundleForm.tsx` already had working `nameAr`/`descriptionAr`
inputs with `dir="rtl"`) — the actual bug was purely on the read side: 33 files hardcoded
`.nameEn`/`.descriptionEn` instead of picking a field by locale. Fixed with a new
`src/lib/localizedField.ts` (`localizedField(locale, en, ar)`, falls back to `en` if `ar` is
missing/empty — never renders blank), following the exact precedent of `src/lib/cityAr.ts`'s
`localizedCity()`. Applied across every storefront/account/admin/staff read path: `ProductCard`,
product/bundle listing and detail pages, the homepage, cart, checkout, wishlists, category filter
chips, admin/staff product and bundle tables, the analytics "frequently bought together" pairs, and
the admin bundle/product picker dropdowns. `OrderItem.nameSnapshot` (a frozen English string
written at checkout) was deliberately left unchanged — order-history displays instead prefer the
**live** `product.nameAr`/`bundle.nameAr` via the existing nullable FK, falling back to the
snapshot only if the product/bundle was later deleted (`SetNull`). Categories stay seed-only per
the confirmed scope decision — `nameAr` already renders correctly everywhere it's read, no new
admin UI was built.

**A2 — Dashboard language switcher.** `LanguageSwitcher.tsx` was already a portable, self-contained
component (only used in `StorefrontHeader.tsx` before this phase). Added `<LanguageSwitcher />` to
`admin/layout.tsx`, `staff/layout.tsx`, `delivery/layout.tsx`, and `account/layout.tsx`, in the same
`flex items-center gap-4` header block Phase 13 used for `<ThemeToggle />` — a 4-file, one-line
change. Verified live as Staff (Lina Haddad) and a seeded driver: switching to Arabic puts the
entire nav/forms/tables into Arabic with no English-only screen encountered, including every new
surface built later in this same phase (staff Support Inbox, Today's Collections, delivery history
filters, both new review dialogs) — all were tested in Arabic as part of their own item's QA pass,
not as an afterthought.

`tsc`/`lint` clean throughout. No schema changes.

### Item B — Analytics: missing line chart + visual redesign

**B1 — The "missing" LineChart.** Live investigation (real DOM measurement via `javascript_tool`,
not just reading source) found the LineChart **does render** — nonzero `ResponsiveContainer`
dimensions, a real SVG path with real coordinates, a resolved `stroke` color, and dots — once
verified in a genuinely fresh tab. Static analysis of `getStaffPerformance()` also confirmed
`leaderboard` and `timeline` are built from the same loop over the same rows, so the "empty
timeline points" theory didn't hold up either. Most likely explanation: the chart sits inside the
"Extended Analytics" section, well over a full page-length below the KPI strip/RFM/heatmap, and was
simply scrolled past. No code bug found for B1 in isolation — but see the real bug found and fixed
during B2's verification below, which affected this exact chart.

**B2 — Visual redesign.** New page-scoped token set added to `globals.css` under a `.analytics-theme`
class (deliberately **not** merged into `:root`/`.dark` or `@theme inline`, since this is a fixed
identity independent of the site theme toggle, confirmed via the judgment call above):
`--analytics-bg: #050505`, `--analytics-surface: #161616`, `--analytics-border: #2e2e2e`,
`--analytics-text: #f5f5f5`, `--analytics-text-muted: #9a9a9a`, and three meaning-locked accents —
`--analytics-good: #39ff88` (electric green, always "good/high/on-target"), `--analytics-bad:
#ff3b5c` (vivid red-pink, always "bad/low/at-risk"), `--analytics-neutral: #3ea9ff` (bright blue,
plain magnitude/count data with no inherent direction). Every chart/table on the page was repointed
from the site's brand tokens to this 3-color system, consistently: RFM segment chart's 7-segment
spectrum collapsed onto good/neutral/bad (Champions/Loyal → good, the 3 "watch" segments → neutral,
At Risk/Lost → bad); KPI strip and RFM stat tile deltas; Sales/Cohort heatmap intensity scale →
neutral (a magnitude, not a direction); Staff Performance bar+line → neutral (plain counts);
Delivery Performance's on-time-rate/failed-rate → good/bad respectively, delivered-count → neutral,
plus a new avg-rating column (see F2) colored good/bad/neutral by threshold; Cart Funnel's
recoverable-revenue delta reuses the KPI strip's own good/bad convention. Every shared UI primitive
rendered on this page (`Card`, `Table`, `Badge`, `EmptyState`, the date-range inputs) gets its
background/border/text repointed via CSS overrides scoped under `.analytics-theme`, since those
components live outside this item's edit scope. No query, aggregation, or computed value was
touched — confirmed by re-reading `analytics.ts`'s diff before finishing.

**Real bug found and fixed during B2's live verification, not present before this session's testing
tooling could actually check it:** both bar charts on the page (`RfmSegmentChart`'s and
`StaffPerformanceChart`'s leaderboard `<Bar>`) rendered **zero actual bar shapes** — the
`recharts-bar-rectangle` DOM nodes were present but empty, in a genuinely fresh tab, confirmed via
direct SVG/path inspection (not just "looks fine on screen"). Root-caused to this browser
automation environment never compositing frames (`computer{action:"screenshot"}` consistently
failed with "the Browser pane is not displayed, so the page is not compositing frames"), which
means `requestAnimationFrame` never fires — Recharts' bar entrance-grow animation depends on it, so
the bar shape never gets inserted past its initial zero-height animation frame. The `<Line>` chart
was unaffected because its path `d` attribute is set immediately regardless of animation state,
which is exactly why B1's investigation found it rendering fine while the bar charts (checked more
carefully during B2) did not. Fixed by adding `isAnimationActive={false}` to both `<Bar>` elements —
a reasonable, no-downside change for a dashboard that doesn't need entrance animation anyway, and it
makes rendering deterministic regardless of whether a given viewing environment's `requestAnimationFrame`
ever fires. Confirmed fixed: real bar paths with the correct resolved good/neutral/bad hex colors
render immediately in a fresh tab. This finding is why B1's own investigation is now considered
resolved as "not an app bug, just below the fold" rather than left uncertain — B2's more careful
DOM-level check is what actually proved the charts work.

Verified live as Admin (Staff has no analytics access) in both languages and with the site
ThemeToggle in both positions: the analytics page's background/colors are byte-identical regardless
of the toggle (confirmed via `getComputedStyle` before/after toggling the `.dark` class), matching
the confirmed judgment call exactly. `tsc`/`lint` clean throughout.

### Item C — Staff Support Inbox (reuse, not duplicate)

Investigation found the two admin-only-looking routes staff would need
(`PATCH /api/admin/support-tickets/[id]/status`, `.../assign`) **already allow `STAFF`**
(`requireApiRole("ADMIN", "STAFF")`, despite the `/api/admin/...` path prefix) — no backend change
needed. The customer-facing `support-tickets` routes already do inline role checks that permit
staff too. `proxy.ts`'s `/staff` prefix rule already covers any new `/staff/*` route.

Relocated `SupportFilters.tsx`, `TicketControls.tsx`, `AdminReplyForm.tsx` from
`src/app/admin/support/` to `src/components/support/` (alongside the existing
`TicketStatusBadge.tsx`), matching the Delivery Support precedent from Phase 13 exactly rather than
cross-importing from the admin route tree. New `src/app/staff/support/page.tsx` and
`support/[id]/page.tsx` — thin copies of the admin pages pointed at `/staff/...` links instead of
`/admin/...`. Added a `support` nav link + i18n key to `StaffNav.tsx`/`staff.nav`. No new API route,
no new Prisma model, no `proxy.ts` change.

Verified live as Staff (Lina Haddad): list loads real tickets, opened one, posted a real reply
(confirmed it landed in the thread) — same underlying API/components as Admin's page, working
identically. Role sweep: Customer → redirected to `/`, logged-out → redirected to `/login`, both
via direct `fetch()` with `redirect:'follow'` checked against `.redirected`/`.url` (not just
`status`, per the Phase 7 near-miss lesson). `tsc`/`lint` clean.

### Item D — Delivery earnings → "Today's Collections"

Confirmed via schema: `DeliveryAssignment.deliveredAt` is a direct field (no join needed), and
`Order.paymentMethodLabel` is a stable checkout-time string snapshot (`"Cash on Delivery"` vs
`"Card on file"`) independent of the live `PaymentMethod` row. The old page's
`DeliveryAssignment.earningsAmount` (the driver's own shipping-fee pay) was the wrong figure
entirely for this ask — drivers are salaried, so what they actually need is **cash collected from
customers today, owed to the accountant**, i.e. `Order.total` summed across today's COD deliveries.

Rewrote and renamed the route from `/delivery/earnings` to `/delivery/collections` (folder renamed,
`DeliveryNav.tsx` href/label updated). New query: `deliveryAssignment.findMany` filtered to
`status: "DELIVERED"`, `deliveredAt` within `[startOfToday, startOfTomorrow)`, and
`order.paymentMethodLabel === "Cash on Delivery"`. Renders one clear total ("Total cash to hand
over"), the list of today's COD deliveries backing it, and a secondary "no cash owed" list for
today's non-COD deliveries (for reconciliation completeness). No month view, no lifetime total, no
non-COD amount in the total. Naming judgment call resolved as **"Today's Collections"** /
**"تحصيلات اليوم"** — reads as "money collected," not "your pay," in both languages.

Verified live: advanced two real active assignments (Yousef Zeidan's BT-1086 and BT-1167, both COD)
to `DELIVERED` through the real status-update flow, confirmed the collections page showed the
correct running total (73.300 + 47.400 = 120.700 JD) matching a manual sum, correct per-delivery
list entries, and confirmed in Arabic (`تحصيلات اليوم`, `120.700 د.أ`). `tsc`/`lint` clean.

### Item E — Delivery history filters

Added a date-range filter (two-date-input pattern copied from `AnalyticsDateRangeFilter.tsx`) and
an order-number search filter (copied from `OrderFilters.tsx`'s commit-on-blur/Enter `Input`
pattern) via a new `DeliveryHistoryFilters.tsx` client component, using the same
`useSearchParams`/`setParam` URL-sync convention used everywhere else filtered lists exist in this
app. `page.tsx` extended its existing `where` with an `assignedAt` range (chosen over `deliveredAt`
since it's the one timestamp every row in this list always has — a `FAILED` assignment never gets a
`deliveredAt`) and an `orderNumber` contains-filter.

Verified live as Yousef Zeidan (20+ real assignments): search by a real partial order number
correctly narrowed to one result; a date range excluding all history correctly showed the empty
state; a full-history date range showed everything again; URL params round-tripped correctly
through direct navigation (shareable/back-button-safe, matching the rest of the app's filter
convention). `tsc`/`lint` clean.

### Item F — Product and delivery reviews from the account order page

**F1 — Product review.** Investigation found the entire product-review backend **already existed
and worked** — `Review` model, `POST /api/reviews`, `createReview()` (ownership + `DELIVERED`-status
+ one-review-per-order-item validation, recomputes `Product.avgRating`/`reviewCount`),
`StarRatingInput`/`StarRatingDisplay`, `getReviewableOrderItems()` — it just wasn't reachable from
`/account/orders/[id]`, only from the storefront product-detail page. Added a
`WriteOrderItemReviewDialog.tsx` (new) to the order-item row for each `DELIVERED` order's line item
where `item.productId` is set (bundles are out of scope — reviews are product-scoped, not
bundle-scoped, per the existing schema/service) and the current user hasn't already reviewed that
specific order item. Added photo upload: `"reviews"` added to `UploadSubfolder`, `CUSTOMER` added to
`/api/uploads`'s allowed roles with a forced `reviews/` destination (server-controlled, matching the
existing DELIVERY-role precedent — a spoofed `subfolder:"products"` request from a customer session
still lands in `reviews/`), a new optional `Review.photoUrl` column (migration), and a new
`ReviewPhotoUploader` component (mirrors `ReportPhotoUploader`'s shape exactly). The storefront's
own `WriteReviewForm.tsx` got the same photo field for consistency, since both forms hit the same
`POST /api/reviews`.

**F2 — Delivery/service rating (new).** Added nullable `rating`/`comment` directly on
`DeliveryAssignment` (migration) — mirrors `Review.rating` being per-unit-of-purchase, per the
confirmed judgment call, rather than a separate model. New `WriteDeliveryRatingDialog.tsx` on the
order page's delivery card, shown once the order's latest `DeliveryAssignment` is `DELIVERED` and
ungraded (a `StarRatingDisplay` shows instead once rated). New
`PATCH /api/delivery/assignments/[id]/rating` (`CUSTOMER`-only, ownership-checked against the
**order's** `userId`, not the driver's — same 404-hides-existence pattern the driver-facing status
route already uses, just inverted). Wired into `getDeliveryPerformance()` in `analytics.ts`: an
`avgRating`/`ratingCount` accumulator alongside the existing `delivered`/`failedRate`/`onTimeRate`
fields, surfaced as a new column on the Delivery Performance table (colored good/bad/neutral by
threshold, per B2's palette).

**F3 — Verification and moderation gap.** `avgRating`/`reviewCount` are pre-existing denormalized
fields recomputed by `createReview()` — confirmed live that a real new review immediately updated
the count/average shown on both the product card (search results) and the product detail page, with
the review's own comment and star rating rendering correctly. No admin/staff review-moderation
surface exists anywhere in the app (no list/delete UI for reviews) — flagged in Known Issues as a
real, out-of-scope-for-this-phase gap, not built here.

**Full live verification** (as Sara Khoury, a real customer with real `DELIVERED` orders, both via
the browser and direct `fetch()` role/ownership sweeps):
- Submitted a real product review (5 stars is the form's default, a comment, no photo — see the
  environment note below on why photo upload couldn't be exercised) on a real delivered
  order-item — confirmed it appeared on the product detail page, confirmed `Product.avgRating`/
  `reviewCount` updated (4.6 → shown with 5 reviews, up from 4), confirmed the "Write a review"
  trigger disappeared for that specific item afterward (one-review-per-order-item, already-existing
  service behavior).
- Confirmed a duplicate-review attempt and a review attempt against a genuinely non-existent
  order-item ID are both rejected (400) via direct API calls.
- Confirmed a review attempt against a real order-item belonging to a **cancelled** (non-`DELIVERED`)
  order is rejected with `"You can only review products from delivered orders"` (400) — the
  pre-existing gating logic, unchanged, re-confirmed working.
- Submitted a real delivery rating (4 stars) on a different real delivered order — confirmed the
  trigger was replaced by a star display, confirmed the rating appears correctly in the driver's
  (Khaled Fares) row on the admin analytics Delivery Performance table ("4.0 (1)").
- Role/ownership sweep on the new rating route: Admin → 403, a Delivery session → 403, logged-out →
  401, and — critically — a **different real customer** (Nour Abdallah) targeting the **real**
  assignment ID of Sara's already-rated delivery got a **404** (existence hidden, not just denied),
  and a direct DB re-check afterward confirmed the rating/comment were genuinely untouched by the
  attempted hijack (still exactly `4`/`null`), not just that the HTTP response looked right.

**Real environment defect found and root-caused during this item's verification, not related to any
Phase 14 code change:** attempting an actual image-byte upload (any role — reproduced identically
as Admin, with zero involvement of the new `CUSTOMER`/`reviews` code path) crashes the entire dev
server process (`Error: Could not load the "sharp" module using the win32-x64 runtime,
ERR_DLOPEN_FAILED`), which in turn takes down the co-located embedded-Postgres process too (via
`concurrently`'s `--kill-others-on-fail`) — the same failure shape logged as a one-off, unreproduced
curiosity back in Phase 7/13, except this time it reproduces **every single time**, for every role,
confirmed via direct `curl` against both a browser-launched and a directly-run dev server instance.
Root-caused (not just observed) by capturing the server's own stderr at the moment of the crash: the
native `sharp-win32-x64-0.35.3.node` addon fails to `dlopen` under this environment's Node.js
v26.4.0 + Turbopack combination specifically — `sharp` loads and runs correctly via a plain `node -e`
script (confirmed working, byte-for-byte, both before and after two different reinstall attempts:
`npm rebuild sharp` and a full `rm -rf` + `npm install sharp`), but fails identically every time
Turbopack's own module loader (`externalImport`) tries to load the exact same file. This means it's
a genuine Node 26 / Turbopack / sharp native-addon ABI incompatibility in this specific environment,
not a corrupted install and not something a package reinstall can fix — see the new Known Issues
entry below. Because this reproduces for **every** role and **every** upload route (products,
delivery-reports, avatars, and now reviews alike), it is **not** a Phase 14 regression — confirmed
by triggering it as Admin uploading through the pre-existing, untouched `products` path, with the
identical crash and stack trace.
- **Practical consequence for this session's verification**: the review-photo-upload code path
  (`ReviewPhotoUploader`, the `reviews` subfolder, the `CUSTOMER`-role branch in
  `/api/uploads/route.ts`) is confirmed correct by code review and by the fact that it follows the
  exact same pattern as the already-working `DELIVERY`/`ADMIN`/`STAFF` paths — but an actual
  end-to-end image byte upload could not be exercised live in this session without repeatedly
  crashing the dev server, so that specific sub-path is **not** live-verified this session, unlike
  everything else in this phase. Flagged honestly rather than claimed.

> **Update — resolved in the Phase 15 follow-up (see §12).** Both the sharp/Turbopack crash and the
> unverified photo-upload path above were addressed head-on rather than left as accepted risk:
> confirmed via a webpack-mode diagnostic that Turbopack was genuinely the cause (matches a known,
> tracked upstream bug, not a Node 26 issue), fixed by pinning `sharp` to the exact version `0.34.4`
> (was `^0.35.3`), and the review-photo-upload path was then actually exercised end-to-end with a
> real file as a real customer, photo confirmed rendering on the public product page. See §12 for
> full detail — this note exists so this section's own "not verified" language isn't misleading to
> a future reader who only skims this far.

`tsc`/`lint` clean after every file across all of Item F.

---

## Known Issues (single running list — supersedes scattered per-phase gap notes above)

This is now the one place to check for everything still wrong, incomplete, or deferred across the
whole app, pulled together from every phase's write-up plus what Phase 16 found. Phase-specific
sections above (§2–§13) keep their original detail for historical context, but this list is the
current, accurate source of truth.

**Corrections to earlier phase write-ups (found stale during Phase 16's investigation):**
- §6/§10 describe "no customer-facing notification inbox" and the CONFIRMED-without-driver guard as
  only a passive disabled button. Both were already untrue by the start of Phase 16 — a full
  notification inbox (all 4 roles) and the `DeliveryAssignment`-based advance guard both already
  existed, built in an undocumented session between Phase 15 and Phase 16. §13 builds on top of that
  real state (badges + category filtering for the former, a visible red alert for the latter) rather
  than re-building either from scratch. Historical §6/§10 text is left as-is for the historical
  record, but should not be read as the current state — this note plus §13 supersede it.

**i18n:**
- The ~35 dead `metaTitle` i18n keys (browser-tab titles are hardcoded English `export const
  metadata` everywhere except the two product/bundle `generateMetadata` functions) — pre-existing
  since Phase 13, not touched since.
- No native Arabic speaker has reviewed any of `I18N_AR_REVIEW.md`'s flagged register/ICU-plural/
  terminology items across any batch, including Phase 16's new "Batch 6" additions (the Net Revenue
  chart's honesty-caveat phrasing, the no-driver alert copy) — worth a dedicated native-speaker pass
  before shipping to real Arabic-speaking users.
- **Category management has no admin UI** (confirmed scope decision, Phase 14 §11 Item A1) — the
  schema's `nameAr` field works and renders correctly everywhere, but categories can only be
  created/edited via the seed script. A real gap if content ever needs updating outside a
  re-seed.

**Moderation/admin surfaces:**
- **No review-moderation surface exists anywhere** (confirmed Phase 14, §11 Item F3) — no way for
  Admin/Staff to see, hide, or delete an abusive/spam product or delivery review. A real, if
  low-likelihood-so-far, content-moderation gap.

**Testing/infrastructure:**
- Still no automated test suite (Jest/Playwright) — every phase through 16 has been verified live,
  manually, in-browser or via direct `fetch()`/DB queries.
- Swipe-to-close on the mobile drawer nav (Phase 13) is unverified on a real touch device — this
  environment has no real touch-drag simulation. Phase 16's notification nav badge has the same
  category of gap: verified on the desktop nav variant, not independently screenshotted inside the
  opened mobile drawer (identical conditional JSX in both, but the drawer's content unmounts when
  closed and this environment's screenshot/compositing is unreliable — see below).
- ~~`sharp`'s native Windows binary fails to load under Turbopack, crashing the dev server on any
  real image upload~~ — **RESOLVED in the Phase 15 follow-up (§12)**. Root-caused to a known,
  upstream-tracked Turbopack bug (not Node 26, not a corrupted install — confirmed via a webpack-mode
  diagnostic run that uploads succeeded there with the exact same `sharp` version). Fixed by pinning
  `sharp` to the exact version `0.34.4` (was `^0.35.3`) — Turbopack remains the dev bundler, no
  workflow change needed. Verified stable across 6+ consecutive real uploads post-fix. See §12 for
  the full diagnostic trail.
- **This environment cannot composite frames** (`computer{action:"screenshot"}` fails outright, and
  `requestAnimationFrame` never fires) — already known from Phase 14's bar-chart-animation finding,
  hit again in Phase 16 via a second code path (Recharts' tooltip-activation dispatch is itself
  throttled through `requestAnimationFrame`). New workaround recorded in §13 Item 2a: monkey-patch
  `window.requestAnimationFrame` to run synchronously immediately before dispatching a synthetic
  hover event, then always `navigate()` (full reload) afterward rather than continuing to interact
  with the same patched page — leaving the patch active destabilized React's own scheduling once,
  crashing a page transition. Hit a third time in Phase 17 (§14): `screenshot`/`zoom` failed outright
  for the entire session this time (not just at non-default sizes, as in earlier phases) — the new
  star-rating color's numeric contrast was confirmed excellent via computed styles, but a genuine
  visual "does it look clean vs. washed out" read could not be obtained. Flagged, not asserted.
- **Real bug found, not fixed this phase — flagged as a background task instead**: the storefront
  cart appears to not merge duplicate line items for the same product, and/or the client-side
  cart store may not be scoped per logged-in user (a second account's leftover cart contents were
  still present after logging in as a different customer in the same browser tab, without an
  explicit clear). Found incidentally while verifying Item 1; genuinely unclear if this is a real
  bug or a same-tab-account-switching test artifact — needs dedicated investigation, not a blind fix.
- **Secondary Accent (`#BF5F3F`) as a badge background falls slightly short of AA contrast**
  (Phase 17, §14) — best achievable text color (dark `#121212`) is `4.39:1` against it, white text is
  `4.19:1`, both below the `4.5:1` normal-text minimum (Badge text is 12px, doesn't qualify for the
  3:1 large-text exception). Flagged, not changed — it's the user's own given brand hex for badges
  specifically, and close enough to the threshold to read as a defensible trade-off rather than an
  illegible badge, but on record in case a future pass wants to nudge the foreground/background to
  close the last `0.1`.

**Deliberate scope/design decisions (not bugs):**
- Analytics page's black/vivid identity is intentionally independent of the site's light/dark
  toggle (confirmed judgment call, Phase 14 §11 Item B2) — this is permanent by design, not a bug if
  the toggle "does nothing" on that one page. Re-confirmed unchanged after Phase 16 added the Net
  Revenue chart to the same page.
- "Today's Collections" total only counts Cash-on-Delivery deliveries completed *today*
  (`assignedAt`/`deliveredAt`-scoped) — a driver's shipping-fee pay (`earningsAmount`) is a
  completely separate figure, deliberately not shown on this page anymore (Phase 14 §11 Item D).
  Confirmed in Phase 16 (§13 Item 3) that this page's logic never reads `paymentStatus` at all, so
  the COD-accrual fix has zero effect on it.
- Delivery/service ratings are per-`DeliveryAssignment`, one-time (no edit/re-rate path once
  submitted) — matches the one-review-per-order-item precedent for product reviews.
- Net Revenue (Phase 16, §13 Item 2b) is a discounts/refunds-adjusted revenue figure, explicitly not
  a true profit figure — this schema has no per-product cost-basis field to compute real profit
  from, same honesty stance as the existing realized-spend-only CLV metric.
- Dark mode's `--ink-muted` token (Phase 17, §14) intentionally does **not** hold the literal
  "Text-Muted" hex given in that update's spec (`#666666`, which fails AA contrast) — it holds the
  "Text-Secondary" value (`#A0A0A0`) instead, since that's what this token has always actually meant
  across ~80 files app-wide (confirmed by audit: form labels, nav links, descriptions). The literal
  `#666666` value lives under a new, narrower `--ink-faint` token, applied only to the footer and the
  theme-toggle control. See §14 for the full reasoning — a deliberate reinterpretation, not an
  oversight, and flagged in case more surfaces should move to the dimmer tier.

**Not exercised this build (carried forward from earlier phases, still true):**
- A live bundle purchase through checkout, the mock-card checkout path, a full return/refund flow,
  and driver-reassignment-after-a-failed-delivery end-to-end — all lower-risk, genuinely unverified
  rather than suspected-broken (see §5/§6 for detail).

---

## §12 — Phase 15: sharp/Turbopack root-cause fix, real F1 photo verification, full security audit

Three distinct pieces of follow-up work, done in order since the first two blocked the third:
(1) an honest check of whether Phase 14's photo-upload claim actually held up, (2) a real second
attempt at the sharp/Turbopack crash rather than accepting "reinstalls didn't fix it," and (3) a
dedicated security audit — a distinct pass from feature work, with a live-tested before-picture
produced before any fix was made, exactly as asked.

### 1 — Was F1's photo upload actually verified?

No. Re-reading the Phase 14 transcript confirmed it directly: the photo attachment was explicitly
skipped when submitting Sara Khoury's review ("no test image file available in this environment"),
and the only real image upload attempted afterward went through the pre-existing Admin
product-upload path (to investigate the crash), never back through the new review flow. This was
stated plainly before doing anything else, and the photo-upload path was treated as unverified,
not done, until fixed and actually tested (see §3 below).

### 2 — Sharp/Turbopack crash: real root cause, real fix

Following the exact steps requested, in order, with actual outcomes reported (not assumed):

- **`node -v` / `npm ls sharp` vs. sharp's documented Node support**: `node -v` → `v26.4.0`.
  `node_modules/sharp/package.json`'s own `engines` field is `>=20.9.0` with no upper bound — sharp
  does **not** self-declare an incompatibility with Node 26. This ruled out "sharp doesn't support
  this Node version" before doing anything else.
- **Diagnostic: `next dev --webpack` (no Turbopack), same real upload**: booted cleanly, and a real
  multipart image upload (`POST /api/uploads` via `curl` with an actual PNG file, as Admin)
  **succeeded** — `200`, a real `.webp` file written to disk, server stayed up. This conclusively
  isolated Turbopack as the cause, matching a known, currently-tracked upstream bug
  ([vercel/next.js#60035](https://github.com/vercel/next.js/issues/60035), tracked internally as
  `PACK-2183`; [lovell/sharp#4567](https://github.com/lovell/sharp/issues/4567) reports the
  identical `ERR_DLOPEN_FAILED` symptom under Turbopack + Next 16 + sharp 0.35.3, resolved by
  downgrading to sharp 0.34.4 with zero app-code changes) — not a Node-version mismatch, not a
  corrupted install.
- **Actual fix**: pinned `sharp` to the exact version `0.34.4` (`npm install sharp@0.34.4
  --save-exact`, `package.json`'s `"sharp"` entry changed from `"^0.35.3"` to `"0.34.4"`) — keeping
  Turbopack as the dev bundler, no workflow change. Confirmed via `npm ls sharp` and a standalone
  `node -e` sharp smoke test that the correct binary installed. Cleared `.next`, restarted
  `npm run dev` (default, Turbopack active) — a real image upload **succeeded** (`200`, real `.webp`
  written), then **stress-tested with 5 more consecutive real uploads, all succeeded**, server
  stayed up throughout. `tsc --noEmit`/`npm run lint` clean after the `package.json` change.
- Not needed: falling back to webpack permanently (step 3 in the plan) — the sharp pin alone fully
  resolved it under Turbopack.

### 3 — F1 photo-upload: actually completed this time

Claude in Chrome wasn't connected in this environment, so real-file upload testing used the
sandboxed Browser pane's DOM File API instead — constructing a real `File` object from real bytes,
assigning it to the file input's `.files` via `DataTransfer`, and dispatching a real `change` event.
This is the same underlying technique browser-automation frameworks (Playwright, Selenium) use for
file-input testing — it exercises the identical client code, network request, and server-side
multipart/sharp/DB path a real user's file picker would, not a shortcut around any of it.

Logged in as Sara Khoury, opened `WriteOrderItemReviewDialog` on a real delivered order-item still
missing a review (BT-1006's blush item), attached a real small test PNG through the actual file
input, rated 4 stars, added a comment, submitted. Confirmed: the upload succeeded and the dialog's
photo preview updated to the real uploaded URL; after submission, the review appeared on the
product's public detail page with the correct comment text; the photo's URL
(`/uploads/reviews/....webp`) is present in the page's rendered `<img>` tags; a direct `fetch()` of
the raw file returned `200`, `image/webp`, and the exact expected byte count; and loading the URL
via a fresh `Image()` object confirmed it genuinely decodes (`naturalWidth: 1, naturalHeight: 1`,
correctly matching the 1×1 test image used). This is real, live, end-to-end verification — not
inferred from the API response alone. The test review was deleted afterward and the product's
`avgRating`/`reviewCount` recomputed to remove the scratch data.

### 4 — Full security audit

A dedicated pass, run as its own distinct exercise rather than folded into feature work. Every row
below was actually tested live (`curl` against the real running dev server, real cookie-jar
sessions for Admin/Staff/Delivery/two separate Customers/logged-out, real cross-user resource IDs
for ownership checks) — nothing here is "should be fine, wasn't tried."

#### Before-picture

| Area | Tested | Result |
|---|---|---|
| Password hashing | Code-confirmed (`bcryptjs`, cost 10, `createManagedAccount` hashes temp passwords before storing); confirmed no plaintext appears in any auth-route log/response | **Pass** |
| JWT signature/expiry verification | Sent a missing, a malformed (`garbage.not.a.jwt`), and a forged-but-well-formed token to a real protected route (`/api/admin/staff`) | **Pass** — all three `401`, a real admin cookie `200`, a real cookie with an appended-garbage (corrupted signature) `401` |
| Logout / session revocation | Logged in, confirmed access, logged out, **replayed the identical old cookie value** against a protected route | **Pass** — `401` after logout; revocation is server-side (DB `Session.revokedAt`), not just a client cookie clear |
| Cookie flags | Read the raw `Set-Cookie` header via `curl -v` | **Pass** — `HttpOnly; SameSite=lax` always on; `Secure` correctly omitted in dev (conditional on `NODE_ENV==="production"`, which `next start`/production builds set automatically) |
| Login rate limiting | Hammered `/api/auth/login` with a wrong password 12× | **Pass** — `401`×10 then `429`×2, exactly matching the documented 10-attempt/15-minute window |
| **Registration rate limiting** | Hammered `/api/auth/register` with an already-taken email 12× (safe — never creates an account) | **FAIL** — all 12 returned `409`, never `429`. Zero brute-force/spam protection existed. |
| **Change-password rate limiting** | Hammered `/api/auth/change-password` with a wrong current password 12× (as a real logged-in customer) | **FAIL** — all 12 returned `400`, never `429`. Zero protection existed. |
| Role gates across the app | Systematic sweep: Admin-only routes (`admin/staff`, `admin/promo-codes`, `admin/settings/*`, `admin/users/export`), Admin\|Staff routes (`products`, `admin/orders/export`), Staff-only (`staff/delivery-accounts`), Delivery-only (`delivery/reports`), and the customer-facing routes never previously swept (`addresses`, `cart`, `checkout`, `wishlists`, `wishlist-items`, `returns`, `payment-methods`, `notification-preferences`, `support-tickets`, `reviews`) | **Pass** — every route correctly gated for its intended role(s); wrong roles `403`, logged-out `401`, including the deliberate Admin-403-on-`staff/delivery-accounts` asymmetry from Phase 8 still holding |
| Cross-customer ownership | Nour (a real customer) targeting Sara's real address, wishlist, support ticket, and order (reorder) IDs directly | **Pass** — all four correctly `404` (hides existence) |
| Cross-driver ownership | Khaled targeting Yousef's real `DeliveryAssignment` id for a status update | **Pass** — `404` |
| Client-supplied identity trust | Customer session attempting `POST /api/orders/[id]/assign-driver` with a real `driverId` in the body | **Pass** — `403` (Staff/Admin-only route, correctly gated before the body's `driverId` is ever used) |
| `User` queries without `select` | Grepped every `prisma.user.*` call in the tree, cross-checked against every file touched since the last audit (Phase 14's new routes included) | **Pass, no active leak** — but 3 pre-existing queries (`admin/users/[id]/page.tsx`, `admin/staff/page.tsx`, `api/admin/users/export`) fetched full `User` rows (incl. `passwordHash`) despite only ever serializing narrow fields out — undisciplined, flagged for hardening |
| `/public/uploads/**` read exposure | Confirmed via code (no auth on static file serving; `/uploads/*` absent from `proxy.ts`'s matcher) | **FAIL (by design gap)** — any uploaded file was viewable by anyone with its URL, including `delivery-reports/` (internal driver problem-report photos) |
| Error responses / stack traces | Malformed JSON, wrong-typed fields, and an empty body sent to `addresses`, `checkout`, and `admin/promo-codes/[id]` | **Pass** — every response was a clean, generic zod-driven message; no stack trace, SQL, or file path ever leaked |
| Zod validation coverage | Sent malformed/wrong-type/oversized payloads directly to the ~10 routes flagged as under-validated | **FAIL** — `notification-preferences` (invalid enum), `orders/reorder` (wrong-type `orderId`), and `wishlist-items` (wrong-type `productId`) all threw **unhandled `500`s**; `wishlists` accepted a 10,000-character name with no cap (`200`) |
| Raw SQL / injection | Grepped the entire tree for `$queryRaw(Unsafe)`/`$executeRaw(Unsafe)` | **Pass** — zero hits in app code (only in generated Prisma client docs) |
| XSS | Submitted a real review with `<script>alert(1)</script>` in the comment, fetched the rendered public product page's raw HTML | **Pass** — rendered as `&lt;script&gt;`, HTML-entity-escaped, not executable |
| File upload validation | Sent a text file with a spoofed `Content-Type: image/png` header directly to `/api/uploads`; sent a 9MB file | **FAIL (the spoofed-content case)** — passed the MIME-string check, then crashed into `sharp()` with an unhandled `500` instead of a clean rejection. Size cap (**Pass**) correctly rejected the 9MB file with a clean `400`. |

#### Fixes applied (each re-tested the same way the original finding was tested)

1. **Rate limiting extended** to `register` (keyed per-IP) and `change-password` (keyed per
   authenticated `userId`, so a stolen-cookie attacker can't brute-force the current-password field
   from a different network than the real user) — reused the existing
   `src/lib/auth/rate-limit.ts` in-memory limiter as-is, same 10-attempt/15-minute convention as
   login. **Re-tested**: both routes now `429` on the 11th attempt; confirmed no cross-contamination
   with login's own rate-limit key or with a different account's key.
2. **Zod validation added** to `notification-preferences` (real enum checks against the actual
   Prisma `NotificationCategory`/`NotificationChannel` values, new
   `src/lib/validation/notificationPreferences.ts`), `orders/reorder`, `wishlist-items` (both
   add/remove), `wishlists` (100-char cap on list name), `addresses/[id]` PATCH, `promo-codes/validate`,
   and `admin/staff/[id]`/`staff/delivery-accounts/[id]` PATCH (new shared
   `src/lib/validation/managedAccount.ts`, closing a real gap where a non-string `firstName`/`phone`
   would previously have hit an untyped Prisma write). Also added an explicit length cap (2000 chars)
   on `delivery/assignments/[id]/status`'s free-text `failedReason`. **Re-tested**: every previously-500
   or previously-uncapped case now returns a clean `400` with a real validation message; every
   previously-working valid request (a real notification-preference toggle, a real wishlist
   creation, a real staff/driver detail edit, a real promo-code check) still returns `200` — zero
   regressions.
3. **Upload route hardened against spoofed content**: `saveUploadedImage()`'s call in
   `src/app/api/uploads/route.ts` is now wrapped in a `try/catch` — a file that lies about its MIME
   type but fails to actually decode as an image now returns a clean `400 The file could not be
   read as a valid image` instead of an unhandled `500`. **Re-tested**: the exact same spoofed-file
   request now `400`s cleanly; a real, valid image upload immediately afterward still succeeds
   (`200`), confirming no regression to the working path.
4. **`select` tightened** on the 3 undisciplined-but-not-actively-leaking `User` queries
   (`admin/users/[id]/page.tsx`, `admin/staff/page.tsx`, `api/admin/users/export/route.ts`) to match
   the query-level-narrowing discipline established after Phase 7's original password-hash
   incident. **Re-tested**: both admin pages still render real seeded data correctly; the CSV export
   still produces identical output with zero `passwordHash`-shaped content (confirmed via a direct
   grep of the response body, not just assumed from the new `select`).
5. **Delivery-report photos auth-gated** (the confirmed judgment call: gate `delivery-reports/`
   specifically, leave `products/`/`avatars/`/`reviews/` public since that content is meant to be
   publicly visible). This subfolder now lives entirely outside `public/` — a new
   `uploads-private/` directory at the project root (gitignored, matching the existing
   `public/uploads/.gitkeep` pattern) — and is served exclusively through a new authenticated route,
   `src/app/api/uploads/delivery-reports/[filename]/route.ts` (`ADMIN`/`STAFF` unconditionally;
   `DELIVERY` only if a `DeliverySupportTicket` they filed actually references that exact filename —
   same ownership-scoping convention as everywhere else in the app, hides existence via `404` rather
   than `403`). `src/lib/server/storage.ts` grew a `rootFor()`/`readPrivateUpload()` split and
   `getFileUrl()` now returns the authenticated route path for this one subfolder instead of a
   static one; `deleteUploadedImage()` handles both path shapes. The 3 existing render call sites
   (`admin/delivery-support/[id]`, `staff/delivery-support/[id]`, `delivery/reports/[id]`, plus
   `ReportPhotoUploader`'s own upload-dialog preview) needed one addition each — Next's `<Image>`
   `unoptimized` prop — since Next's built-in image optimizer fetches images server-side without
   forwarding the viewer's session cookie, which would otherwise `401` against the new authenticated
   route; `unoptimized` makes the browser fetch the URL directly with its own cookies instead, same
   as a normal user request. **Re-tested end-to-end with real data**: uploaded a real photo as a
   driver (URL correctly came back as `/api/uploads/delivery-reports/...`, not a static path);
   confirmed the **old public static path 404s** (file was never written there in the first place);
   confirmed the new route `401`s logged-out, `403`s a Customer, `200`s Admin and Staff, `404`s the
   uploading driver **before** any report references the photo (a photo isn't "owned" until
   attached to a real ticket) and `200`s the same driver **after** creating a real report that
   references it; confirmed a **different** driver still `404`s even after the report exists;
   confirmed the photo genuinely renders (loads, decodes, correct dimensions) on the real admin
   report-detail page in a live browser session. Test report and photo file deleted afterward.

#### Left as documented, accepted risk (not fixed this pass — flagged, not fixed under time pressure without being said)

- **The rate limiter is in-memory and single-process** (resets on restart, doesn't share state
  across instances) and its login/register keys include the client-supplied `x-forwarded-for`
  header, which isn't validated against a trusted-proxy list — a client could theoretically spoof
  this header to evade the per-IP component of the limit (the email/account-scoped component still
  applies for login). A real fix needs a shared store (e.g. Redis) and a deployment-level decision
  about which proxy headers are actually trustworthy once this runs behind Hetzner's reverse proxy
  (§4a) — out of scope for a code-only pass, and flagged here rather than silently left unmentioned.
- **Several customer-hub routes aren't restricted to the `CUSTOMER` role specifically** —
  `addresses`, `cart`, `wishlists`, `payment-methods`, `support-tickets`, and
  `notification-preferences` all accept any authenticated session (Admin/Staff/Delivery included),
  scoped correctly to that session's own `userId`. Confirmed this is **not** a data-leak or
  privilege-escalation issue — an Admin hitting `GET /api/cart` gets back their own (empty) cart,
  never another customer's data (verified by reading the actual response body, not just the status
  code). It's inconsistent with `POST /api/reviews`'s explicit `CUSTOMER`-only gate, though, and
  probably isn't intentional — Admin/Staff/Delivery are internal accounts, not meant to shop. Not
  fixed this pass since it's a product/design decision (should internal roles be blocked from ever
  using the storefront's cart/wishlist/support features under their own account?), not a security
  fix — flagged for a future decision rather than guessed at.
- **No admin review-moderation surface** (carried forward from §11 Item F3, still true) — nothing
  new found here, just re-confirmed still absent.

`tsc --noEmit`/`npm run lint` clean after every single file changed across this entire section, not
just once at the end.

---

## §13 — Phase 16: discount visibility, analytics fixes, COD accrual, notification badges,
## driver-guard alerts

Six items from live use of the app since Phase 14, worked in the same investigate → build → test →
full role/language/theme QA → fix → re-test → next-item loop as every prior phase, no check-ins
between items.

**Correcting the record first**: this task referenced "the notification/order-guard/badge
follow-up session" as something that happened after Phase 15 but was never written up. Investigation
at the start of this phase confirmed that session did happen and its work is real and live in the
codebase — but §6/§10's Known Issues text still said "no customer-facing notification inbox exists,"
and the CONFIRMED-without-driver situation was described as only a passive disabled button. Neither
was true by the time this phase started: a full notification inbox (all 4 roles, category-tagged,
mark-read/mark-all-read) and a `DeliveryAssignment`-based guard blocking `ON_DELIVERY`/`DELIVERED`
without an active driver both already existed, undocumented. This phase's six items build on top of
that real, already-shipped foundation rather than starting from the (stale) written record — the
Known Issues section below is corrected accordingly.

### Item 1 — Checkout discount line

`account.orders.detail`'s and both `admin`/`staff orders.detail`'s order-detail pages already
rendered a conditional `Discount -{amount}` row between Subtotal and Shipping, reading the
already-persisted `Order.discountTotal` field — no change needed there, re-verified live with a
real promo-code order. Two surfaces were missing it: `CheckoutForm.tsx`'s live pre-order summary
(computed `discountAmount` client-side already, just never rendered a row for it) and the order
confirmation page (`checkout/confirmation/[orderId]/page.tsx`, which only ever rendered line items
+ Total, no Subtotal/Shipping/Discount breakdown at all — extended its query to select
`subtotal`/`discountTotal`/`shippingFee` and added the full breakdown). New
`storefront.checkout.discount` / `storefront.confirmation.{subtotal,discount,shipping}` keys,
reusing the exact "Discount"/"الخصم" wording already shipped elsewhere.

**Real, pre-existing bug found and fixed while verifying this, directly relevant to the item's own
goal ("customer has no visibility into how much they saved")**: `CheckoutForm.tsx`'s
"Promo applied: -{amount}" message, the store-credit-balance line, and the loyalty-points-value line
all rendered with the numeric part silently missing (`"Promo applied: -"`, `"0 points ="` with
nothing after) — confirmed via direct DOM read, and via a captured console error ("Functions are not
valid as a React child... transformed"). Root cause: all three used `t.rich(key, { placeholder: () =>
<Money .../> })` where the message itself used a **bare** ICU placeholder (`"...{amount}"`) instead
of tag syntax (`"...<amount></amount>"`) — `next-intl`'s `t.rich` only invokes a function value when
the message contains a matching `<tag>` for it; against a bare placeholder it just inserts the raw
function, which React then refuses to render. Fixed by adding the missing `<amount>`/`<balance>`/
`<value>` tags to the three affected `en.json`/`ar.json` messages (`promoApplied`, `useStoreCredit`,
`pointsEqualsValue`) rather than changing the component code, which was already using the correct
`RichTagsFunction` shape for a tag substitution.

Verified live end-to-end: placed a real order as Sara Khoury (Arabic locale) with `WELCOME10`
applied — checkout summary, "Promo applied: -{amount}" message, and the confirmation page all
showed the correct discount figure in Arabic (`تم تطبيق الخصم: -5.960 د.أ`, `الخصم -5.960 د.أ`
between Subtotal/Shipping); re-confirmed the account order-detail page's pre-existing discount row
still renders correctly (regression-check, no code touched there). `tsc`/`lint` clean throughout.

### Item 2 — Analytics

**2a. Tooltip fix.** Root cause found in `RfmSegmentChart.tsx` and `StaffPerformanceChart.tsx`'s bar
tooltip (not the line tooltip, which was already correct): both passed
`formatter={(value) => [translatedCountString, ""]}` — the second tuple slot (Recharts' "name") was
hardcoded empty, so the tooltip item rendered as a dangling `" : 4 customers"` instead of a clean
`"Customers: 4"`. This is a **different** bug from Phase 14's `isAnimationActive={false}` fix (bars
not rendering shapes at all, due to `requestAnimationFrame` never firing in this sandboxed
browser) — that fix is confirmed still correctly in place, not regressed.

Per the explicit instruction not to declare this fixed on static analysis alone a second time, this
was verified via actual rendered tooltip DOM content, not a screenshot or code read. Real hover
proved unreachable through every synthetic-event technique tried (`MouseEvent`/`PointerEvent`
dispatch on the bar, the wrapper div, and the SVG, with and without manually-set `offsetX`/`offsetY`)
— tracing Recharts v3's actual source (`node_modules/recharts/es6/state/mouseEventsMiddleware.js`)
found why: its mousemove handler schedules the real tooltip-activating dispatch via
`requestAnimationFrame`, which never fires in this environment (the same root cause as Phase 14's
bar-animation bug, just hit a second time via a different code path). **New reusable technique for
future sessions**: monkey-patching `window.requestAnimationFrame = (cb) => { cb(); return 1; }`
before dispatching a synthetic `mousemove` on the chart makes Recharts' tooltip state update
synchronously, after which the real tooltip DOM (`.recharts-tooltip-wrapper`) can be read directly.
Confirmed this fix live, before/after: pre-fix DOM read showed `<span class="...item-name"></span> :
<span class="...item-value">4 customers</span>` (empty name); post-fix shows `Customers : 4` (RFM,
English) and `العملاء : 4` (Arabic) with the segment name correctly in the tooltip's bold label line
above (`Potential Loyalist` / `موالٍ محتمل`) — matching the originally-reported symptom exactly.
Same fix applied to `StaffPerformanceChart`'s bar tooltip (`Orders`/`الطلبات`), confirmed working
(`Betolla Admin` / `Orders : 2`). New `admin.analytics.rfm.customersLabel` /
`staffPerformance.ordersLabel` keys; the now-dead `common.customersCount` and
`staffPerformance.ordersProcessedTooltip` ICU-plural keys were removed (no remaining consumers,
confirmed via grep), following this codebase's established practice of deleting dead labels once
every consumer switches to a replacement.

**Note on the `window.requestAnimationFrame` patch**: it destabilized the page's own React
scheduling when left active (one page transition crashed to a browser-level "page couldn't load"
error mid-verification) — a self-inflicted side effect of overriding a core browser API, not an app
bug. Always followed with a real `navigate()` (full reload) afterward, never trusted for more than
one immediate DOM read.

**2b. New "Net Revenue Over Time" chart.** No cost-basis field exists anywhere in the schema
(`Product`/`ProductBundle` confirmed via grep — no `costPrice`/`cogs`/`wholesale`), so per the task's
own fallback instruction this plots **net revenue** (`subtotal - discountTotal - refundedAmount`,
PAID orders, bucketed by day) and is honestly labeled "Net Revenue Over Time" / "صافي الإيرادات عبر
الزمن" — never "Profit" — matching the existing CLV-honesty precedent. New
`getNetRevenueOverTime(range?)` in `analytics.ts` (same `DateRange`/`dateRangeWhere()` convention as
every sibling function), new `NetRevenueChart.tsx` (mirrors `StaffPerformanceChart`'s `LineChart`
shape, `stroke="var(--analytics-neutral)"` since it's a magnitude not a good/bad signal, tooltip
built correctly from the start using 2a's fix), wired into the "Extended Analytics" section (first
card, ahead of Staff Performance) with the same period-over-period delta convention as the KPI strip
and Sales Heatmap.

Verified live: all-time total 8,824.870 JD across ~90 daily data points; filtering to June 2026
produced a genuinely different total (1,510.240 JD, `+162.050 JD vs prior period`) with all x-axis
dates confined to June — real re-aggregation, not a client-side filter over cached all-time data.
Confirmed in both languages and analytics' theme-independence held (`getComputedStyle` byte-identical
background before/after toggling `.dark`, same method as Phase 14). `tsc`/`lint` clean throughout.

### Item 3 — COD accrual on delivery + backfill

**Root cause, confirmed**: `recomputeCustomerStatsForUser()` sums only `paymentStatus: "PAID"`
orders; COD orders are created `UNPAID` at checkout and nothing anywhere in the codebase — not
`updateOrderStatus()`, not `syncOrderStatusFromDelivery()`, not any delivery route — ever flipped
that flag. Loyalty `EARN` transactions are likewise only ever created once, in `placeOrder()`, gated
on the same check, so `loyaltyPointsEarned` was permanently baked in as `0` for every COD order at
checkout time. This is why the seed data never showed the bug (seed.ts sets `DELIVERED` orders'
`paymentStatus` directly to `"PAID"` unconditionally, bypassing the real checkout/delivery code path
entirely) — the bug only ever manifested for orders that went through the actual live app flow,
which is exactly what the reported screenshots were.

**Fix**: new `confirmCodPaymentOnDelivery(orderId)` in `customerStats.ts` — idempotent (no-ops
unless `paymentMethodLabel === "Cash on Delivery"` and `paymentStatus === "UNPAID"`), computes
`earned = floor(total × LoyaltyConfig.pointsPerJdSpent)`, flips the order to `PAID` +
`loyaltyPointsEarned`, creates the `EARN` `LoyaltyTransaction`, credits `User.loyaltyPointsBalance`,
then calls `recomputeCustomerStatsForUser`. Wired into both places an order reaches `DELIVERED`
(`updateOrderStatus()` and `syncOrderStatusFromDelivery()` in `orders.ts`) — non-COD (`MOCK_CARD`)
orders are already `PAID` at checkout and untouched by the new branch. "Today's Collections" reads
only `paymentMethodLabel`/`DeliveryAssignment.status`/`deliveredAt`, never `paymentStatus` —
confirmed unaffected by reading its source, no code there needed changing.

**Live-flow verification** (real order, not seed data): placed a real COD order as Sara Khoury
(`BT-MS0GKMAV499`, 53.640 JD with `WELCOME10` applied), assigned a driver, advanced it
Confirmed → On Delivery → Delivered through the real Admin UI. Confirmed: `paymentStatus` flipped to
`PAID` (UI showed "Cash on Delivery (Paid)"), `loyaltyPointsEarned` = 53 (`floor(53.64 × 1.00)`), a
real `LoyaltyTransaction` row (`EARN`, 53, note "COD payment confirmed on delivery"), Sara's
`loyaltyPointsBalance` 606 → 659, and `CustomerStats` recomputed to a value matching a direct SQL sum
of her currently-PAID orders exactly (confirming correctness, not just "a number changed").

**Backfill — root cause and result, for the record**: zero orders in this dev database were
currently in the broken state, because (as above) seed data was generated already-correct, bypassing
the bug entirely. To prove the one-time backfill script (`scripts/backfill-cod-accrual.ts`) works
against a genuinely affected historical order, one real seeded order (`BT-1111`, Yasmin Tuqan,
74.80 JD) was deliberately reverted via direct SQL to the exact broken shape (`DELIVERED`,
`paymentStatus: UNPAID`, `loyaltyPointsEarned: 0`) — reproducing what a real pre-fix delivered COD
order would have looked like. Running the script: **before** — `loyaltyPointsBalance` 383,
`CustomerStats` 386.41 JD / 6 orders; **after** — order flipped to `PAID` with 74 points credited
(`floor(74.80 × 1.00)`), `loyaltyPointsBalance` 383 → 457, `CustomerStats` recomputed to
461.21 JD / 7 orders (exactly +74.80/+1, matching the order's own total). Re-running the script
immediately after found 0 affected orders — confirmed idempotent. The script constructs its own
`PrismaClient` rather than importing `src/lib/db.ts`/the service layer, since both are marked
`"server-only"` (a Next.js marker package that throws at runtime outside Next's own module
resolution) — the same pattern `prisma/seed.ts` already uses for its own standalone
`CustomerStats`-equivalent computation. This is a one-time correction script, documented here, not a
standing migration — it should not need to run again once any real historical backlog is cleared.

`tsc`/`lint` clean throughout.

### Item 4 — Notification unread badges + category filtering

A working notification inbox already existed for all 4 roles (see the correction note above) — this
item added what was genuinely missing: an unread-count badge on the nav link, and category
filtering/per-category counts on the inbox page itself.

**Nav badge**: each of the 4 layouts already ran one `prisma.user.findUniqueOrThrow` query before
rendering its nav — added a sibling `prisma.notification.count({ where: { userId, isRead: false } })`
and passed it into `AdminNav`/`StaffNav`/`DeliveryNav`/`AccountNav` as a new `unreadNotifications`
prop. New shared `NavBadge.tsx` + `formatBadgeCount()` (`src/lib/format.ts`, caps at `"9+"`), reusing
the storefront cart icon's exact `bg-accent`/`rounded-full`/`text-cta-foreground` visual convention,
rendered inline next to the text label (the cart badge overlays an icon absolutely; a text nav link
has no icon to overlay, so this flows inline instead — same colors/shape, different layout).

**Category filter + per-category counts**: `NotificationsList.tsx` (already fetches ≤200 rows in one
query per page) now filters client-side via a `Tabs`/`TabsList`/`TabsTrigger` row (Radix, same
component already used in Settings) — "All" + only the `NotificationCategory` values actually present
for that user (not all 7 unconditionally), each showing its own unread count via the same `NavBadge`
convention. No new API route or query needed. New `common.notifications.allCategories` key;
everything else needed already existed in `common.notificationCategory.*`.

Verified live across all 4 roles and both languages: Admin's badge showed `2` (from a real
"Order confirmed without a driver" OPERATIONS alert, itself a real trigger of Item 5's testing),
Staff (Lina Haddad) showed `4` after also receiving a real customer-submitted support ticket
(`notifyRoles(["STAFF","ADMIN"])`, category `SUPPORT`) — confirmed the "Support"/"Operations" tabs
filtered correctly (clicking "Support" showed only the 2 Support items, correctly excluding the 2
Operations ones), confirmed "Mark as read" decremented both the tab count and the "All" count
correctly. Delivery (Khaled Fares) showed `2` (`DELIVERY_ASSIGNMENTS`). Customer (Sara Khoury, who
accumulated many order-status notifications during this session's own testing) showed `9+`,
confirming the cap. Arabic rendering confirmed for both the nav badge (`ms-1.5` logical margin
correctly flips under `dir="rtl"`) and the inbox page (`الكل3`, `الدعم1`, `العمليات2`). The scratch
support ticket created purely to generate a second category for this test was deleted afterward
(and its 8 resulting `Notification` rows across all 4 staff/admin recipients), leaving only the real
Item-5-testing `OPERATIONS` notifications in place. The mobile-drawer variant of the badge uses the
identical conditional JSX as the verified desktop variant but was not independently screenshotted
open (Radix `Dialog` content unmounts when closed, and this environment's screenshot/compositing is
unreliable per the existing documented limitation) — flagged honestly, same spirit as the
swipe-to-close gap from Phase 13.

`tsc`/`lint` clean throughout.

### Item 5 — Red alert for orders with no driver assigned

The underlying guard (blocking `ON_DELIVERY`/`DELIVERED` without an active `DeliveryAssignment`) and
a passive `text-xs text-ink-muted` note under the disabled advance button already existed (see the
correction note above) — this item upgraded the *visibility* of that same already-real condition.

**Order detail banner**: new `NoDriverAlert.tsx` (`src/components/orders/`), a full-width
`bg-red-600 text-white` banner — the same "strong red" treatment already used by
`DeliverySupportList`'s `Badge variant="critical"` urgent flag, scaled up to a banner rather than a
small pill — shown on both `admin/orders/[id]` and `staff/orders/[id]` whenever `order.status` is
`CONFIRMED` or `ON_DELIVERY` with no active (non-`FAILED`) assignment. **Orders list row badge**:
`OrdersTable`'s `OrderRow` gained an optional `needsDriver` field (computed in both list pages, which
now `include` `deliveryAssignments`), rendered as a small `Badge variant="critical"` next to the
existing status badge. **Dashboard tiles**: added "Orders Needing Driver" to the Admin dashboard
(previously missing entirely — only Staff had an equivalent tile), and fixed a real bug in Staff's
existing `awaitingDriverAssignment` tile query: it used `deliveryAssignments: { none: {} }`, which
undercounts any order whose *only* assignment already `FAILED` (that order has an assignment row, so
`none: {}` was `false`, even though there's no *active* driver) — inconsistent with the "active
assignment = status ≠ FAILED" definition used everywhere else in the app (the guard itself, Today's
Collections). Both tiles now share one corrected where-clause (`status: {in:["CONFIRMED",
"ON_DELIVERY"]}, deliveryAssignments: {none: {status: {not: "FAILED"}}}`) — this also narrows
Staff's tile scope from `PENDING+CONFIRMED` to `CONFIRMED+ON_DELIVERY`, a deliberate alignment with
the rest of this item's "CONFIRMED-or-later" definition rather than an oversight.

Verified live on a real order (`BT-1031`, Farah Odeh, confirmed without a driver via the real Admin
UI as part of generating Item 4's test notification): banner confirmed rendering with
`background-color: lab(48.4493 77.4328 61.5452)` (red-600) and white text via direct
`getComputedStyle` read, byte-identical with `.dark` toggled on/off (hardcoded Tailwind color, not
theme-scoped, confirmed not accidentally re-pointed by `.analytics-theme`-style overrides); Orders
list row showed `Confirmed` + `No driver` badges together; both Admin's new tile and Staff's
corrected tile independently converged on the same count (`13`), confirming consistency. Re-verified
in Arabic: banner text `لم يتم تعيين سائق توصيل بعد - عيّن سائقًا لإبقاء هذا الطلب متقدّمًا.`,
Staff's tile `13 - بانتظار تعيين سائق`.

`tsc`/`lint` clean throughout.

### Item 6 — i18n coverage

Every new string introduced above (`storefront.checkout/confirmation.discount`,
`admin.analytics.netRevenue.*`, `admin.analytics.rfm.customersLabel`,
`admin.analytics.staffPerformance.ordersLabel`, `common.notifications.allCategories`,
`admin.orders.detail.noDriverAlert`, `admin.ordersShared.noDriverBadge`,
`admin.home.tiles.ordersNeedingDriver`) shipped with real `en.json`/`ar.json` entries from the start,
following the established formal-MSA/Western-digit conventions. Translation-uncertain items flagged
in `I18N_AR_REVIEW.md`'s new "Batch 6" entry, same format as every prior batch — most notably the new
Net Revenue honesty-caveat phrasing and the no-driver alert's closing clause.

### Out-of-scope finding, flagged not fixed

While verifying Item 1, the storefront cart showed two separate line items for the exact same
product (52 units + 1 unit) instead of merging into one row with combined quantity, and a large
leftover quantity from one customer's session (Nour Abdallah) was still present in the cart after
logging in as a different customer (Sara Khoury) in the same browser tab without an explicit cart
clear. Genuinely unclear whether this is a real bug (the Zustand/localStorage cart not being
per-user-scoped or not reconciling on login) or an artifact of testing multiple accounts in one
unusual browser session — flagged as a background task for dedicated investigation rather than
fixed blind mid-phase, since it's unrelated to any of this phase's six items.

### Verification summary

`tsc --noEmit` and `npm run lint` were run clean after every file touched across all six items, not
just once at the end (confirmed via the terminal history: dozens of checkpoints). Live browser
verification covered the actually-relevant role(s) per item (Customer for 1/3, Admin for 2, all 4
roles for 4, Admin/Staff for 5), both languages, and — where relevant — both themes with the
analytics page's theme-independence re-confirmed unchanged. All scratch/test data created purely for
verification was cleaned up (the fake support ticket and its 8 notification rows); real orders
advanced through the real app flow during testing (`BT-MS0GKMAV499`, `BT-1031`) were **not** reverted,
matching the established policy from every prior phase that a forward-only state-machine transition
exercised through the real UI is a legitimate outcome, not test pollution to unwind. The one
deliberately-fabricated "legacy broken order" fixture (`BT-1111`, used only to prove the backfill
script) was left in its now-corrected, genuinely valid state rather than reverted, since reverting it
would mean re-introducing the very bug this phase fixed.

---

## §14 — Phase 17: Dark-mode palette update

A design-only change: replace `.dark`'s CSS variable *values* with a new given palette, preserving
existing token *names* wherever the semantic role matched, and adding new tokens only where the new
palette genuinely introduced a role the current 2-tier text/1-hue-accent system didn't have. Light
mode, RTL, and the Analytics page's independent fixed-dark identity (Phase 14) were all explicitly
out of scope and confirmed untouched — see Verification below.

### New palette as given

| Role | Hex | Mapped to |
|---|---|---|
| Primary Surface | `#121212` | `--surface` |
| Secondary Surface | `#1E1E1E` | `--surface-secondary` |
| Primary Accent | `#3CB371` | `--cta` / `--success` (see note) |
| Secondary Accent | `#BF5F3F` | `--accent` |
| Text — Primary | `#FDFDFD` | `--ink` |
| Text — Secondary | `#A0A0A0` | `--ink-muted` (see note below - **not** a 1:1 name match) |
| Text — Muted | `#666666` | new `--ink-faint` (see note below) |
| Borders & separators | `#333333` | `--border` |
| Star ratings | `#E0E0E0` | new `--star` (see note below) |

`--highlight` and `--critical` weren't part of the given table, so both are unchanged. `--cta-hover`/
`--accent-hover` (not given) were derived as ~15%-darker shades of the two new accents
(`#339860`/`#a25136`) following the same relationship the existing light/dark hover shades already
have to their base color. `--success` (also not given a distinct swatch) reuses Primary Accent,
matching light mode's own pre-existing precedent/comment ("Forest Green doubles as the positive/
status color") for exactly the same reason: it's a green, the closest semantic fit of the two given
accents, and the new table gives no third color to use instead.

### Judgment call 1 — Text-Muted's contrast problem, and why `--ink-muted` did NOT become `#666666`

Computed first, as instructed, before wiring anything in: `#666666` on `#121212`/`#1E1E1E` is
**3.26:1 / 2.90:1** — below WCAG AA's 4.5:1 minimum for normal text, confirmed via the standard
relative-luminance formula (not eyeballed). Per the instruction, this triggered a real audit of
`--ink-muted`'s current call sites (218 occurrences across ~80 files, via grep) before deciding
anything - and the audit found this token is used **far more broadly than "footer links and
lesser-used icons"** (the new spec's own description of what Text-Muted is for): real examples
found directly, not inferred - `DeliverySupportControls.tsx`'s `<label>` for "Status"/"Assigned To"
(a field label a Staff/Admin user must read to operate the form), `StorefrontHeader.tsx`'s main
site navigation links, and essentially every product description, table cell, and secondary price
line in the app. Shipping `#666666` under this name would have silently failed AA contrast across
most of the app's secondary text and form labels - exactly the "form label... anything load-bearing"
case the task said to flag rather than silently ship.

**Resolution applied** (a real fix, not just a report-and-wait, per the task's own "propose a
specific fix" instruction): the given **Text-Secondary** value (`#A0A0A0` - `7.16:1`/`6.38:1`
against the two surfaces, comfortably AA, even close to AAA on the darker surface) is what
`--ink-muted` now resolves to in dark mode - because that broad "descriptions, subheadings,
secondary price lines, form labels" role is what this token has always actually meant across the
whole app, confirmed by the audit, not a semantic mismatch. **Zero component changes were needed**
for the ~216 call sites that keep this meaning (re-verified live: product-card descriptions, admin
nav links, and form labels all render at `rgb(160, 160, 160)` = `#A0A0A0` in a real dark-mode
session).

The literal given Text-Muted value (`#666666`) was **not discarded** - it's wired in under a new,
more narrowly-scoped token, `--ink-faint`, applied only to the two places the audit actually
confirmed are genuinely decorative/low-priority, matching the new spec's own named examples:
`StorefrontFooter.tsx` (the footer's nav links + copyright line - a literal, unambiguous "footer
links" match) and `ThemeToggle.tsx` (an icon + one-word secondary toggle control, the closest
equivalent to "a lesser-used icon fill" among this app's actual icon-only controls). Re-verified
live: the real footer text renders at `rgb(102, 102, 102)` = `#666666` in dark mode. This is a
narrower scope than "every icon in the app" - only these two files were reclassified, flagged here
explicitly in case the user wants more surfaces (e.g. the cart icon, the language switcher) moved to
the dimmer tier too.

`--ink-faint` and the repurposed `--ink-muted` are both declared in `:root` as well (equal to the
existing light-mode values, `#6b655d`), so light mode's rendering at every one of these call sites
is provably unchanged - confirmed via a direct `getComputedStyle` read of every relevant CSS
variable in light mode before touching anything, byte-identical to the pre-change values.

### Judgment call 2 — Star ratings: contrast is excellent, but couldn't get a real visual look

`#E0E0E0` against the `#1E1E1E` card surface computes to **12.63:1** (`14.19:1` against the page
background) - very high, nowhere near a contrast problem. Stars didn't have their own dedicated
token before this change (`StarRating.tsx` rendered filled stars via `fill-accent text-accent`,
i.e. whatever the brand accent happened to be) - since the new palette wants star color independent
of the two brand accents, this is a genuinely new semantic role, so a new `--star` token was added
(again, `:root` gets the pre-existing accent value so light mode is unaffected; only `.dark` gets
the new `#E0E0E0`). Re-verified live: a real product page's filled star `<svg>` computes
`fill: rgb(224, 224, 224)` in dark mode.

**Honest limitation, not silently glossed over**: the task asked to actually render this and look
at it, not just trust the numbers, in case a numerically-high-contrast near-white reads as
"washed out" against the card rather than "distinct and clean." `computer{action:"screenshot"}`
(and `zoom`) failed outright every attempt this session with "the Browser pane is not displayed, so
the page is not compositing frames" - the same environment limitation logged elsewhere in this file
(§9e/§11 Item B2), but this session it blocked screenshots entirely rather than just being
unreliable at non-default sizes. So this specific "does it look clean vs. washed out" call could
**not** be visually confirmed this session - flagged plainly rather than asserted. What *is*
confirmed: the star color sits at a deliberately different luminance than both neighboring text
tones on the same card (dimmer than Text-Primary's `#FDFDFD`, brighter than the `#A0A0A0`
rating-count text right next to it), which is a coherent, intentional-looking outcome rather than a
color that would blend into anything around it - but a real look at real pixels is recommended
before considering this fully closed.

### Secondary Accent as a badge background - a related contrast finding, not asked for explicitly but caught by the required accent/badge check

The verification list explicitly asked to check Primary/Secondary Accent contrast against both
surfaces "button/badge text needs to stay readable" - so this was computed too, not skipped:
`Badge`'s `accent` variant uses `text-cta-foreground` (`#121212`, dark) on `bg-accent`
(`#BF5F3F`) - **4.39:1**. White text on the same background is slightly worse, `4.19:1`. Both fall
short of the 4.5:1 AA threshold for normal text (Badge text is `text-xs font-medium`, 12px, which
doesn't qualify for the 3:1 "large text" exception). Re-verified live: the storefront's real "Sale"
badge (`تخفيض`) computes `background-color: rgb(191, 95, 63)` / `color: rgb(18, 18, 18)`, matching
the code and the `4.39:1` figure exactly. This is a real, if small, shortfall - flagged rather than
silently shipped, but **not changed**: it's the user's own given brand hex for badges specifically
(not a token this app was free to reinterpret the way `--ink-muted` was, since there's no existing
broader-usage evidence suggesting `#BF5F3F` means something else app-wide), and 4.39:1 is close
enough to the threshold that it reads as a defensible brand-color trade-off rather than a
broken/illegible badge - but the exact number is on record here in case a future pass wants a
slightly darker or lighter foreground to close the last 0.1.

### Verification

- **Light mode**: confirmed byte-identical via a direct `getComputedStyle` read of every CSS
  variable (`--surface`, `--ink`, `--ink-muted`, `--ink-faint`, `--cta`, `--accent`, `--star`,
  `--success`, `--border`) before any dark-mode toggle - every value matched the pre-existing light
  palette exactly, including the two new tokens correctly falling back to their light-mode
  equivalents.
- **Dark mode**: confirmed the same full variable set resolves to the new palette's intended values
  after toggling `.dark`, then re-confirmed against real rendered elements in a live, logged-in
  session (Arabic locale) rather than just the CSS variables in isolation: the storefront's "Sale"
  badge (`#BF5F3F` bg / `#121212` text), a product card's description text (`#A0A0A0`), the "Add to
  Cart" button (`#3CB371` bg / `#121212` text), the footer (`#666666`), a filled star icon
  (`#E0E0E0`), and admin nav links/form labels (`#A0A0A0`, confirming the load-bearing-safety
  decision above actually took effect app-wide, not just in the one file read during the audit).
- **Analytics page**: confirmed its background is byte-identical (`rgb(5, 5, 5)`) whether `.dark` is
  toggled on or off, re-proving Phase 14's theme-independence judgment call still holds after this
  change - the `.analytics-theme` block was not touched.
- **RTL**: all of the above live checks were done in a real Arabic-locale (`dir="rtl"`) session; no
  layout or mirroring regression observed.
- `npx tsc --noEmit` and `npm run lint` both clean after every edit to `globals.css`, `StarRating.tsx`,
  `StorefrontFooter.tsx`, and `ThemeToggle.tsx`.
- **Not able to verify this session**: a genuine visual (pixel-screenshot) read of the star-rating
  color and the overall dark palette's look-and-feel - `computer{action:"screenshot"}`/`zoom` failed
  outright throughout ("the Browser pane is not displayed, so the page is not compositing frames").
  All verification above is real, live, computed-style confirmation against actual rendered DOM
  elements (not static code reading), but a literal look at rendered pixels should still happen
  before treating the star-rating and general "does dark mode look good" questions as fully closed.

### Files touched

`src/app/globals.css` (`.dark` block values, two new tokens `--ink-faint`/`--star` added to both
`:root` and `.dark`, `@theme inline` mapping extended), `src/components/ui/StarRating.tsx`
(`fill-accent text-accent` → `fill-star text-star`), `src/app/(storefront)/StorefrontFooter.tsx` and
`src/components/ThemeToggle.tsx` (`text-ink-muted` → `text-ink-faint`). No schema changes, no new
API routes, no i18n keys (this phase introduced no new user-facing strings).

---

## §15 — Phase 18: analytics bar-chart readability, loyalty point redemption, dark-mode date inputs

Three fixes, worked in order per the standing instruction (investigate → build → test → full role/
language/theme QA → fix → re-test → next item), followed by a QA + security pass once all three were
verified. No server was running at the start of this session — both Next.js and embedded Postgres
were started fresh (`npm run dev`) before any investigation began.

### Item 1 — Analytics bar-chart gridlines + tooltip re-verification

Only two files on the analytics page use a Recharts `<BarChart>` — `RfmSegmentChart.tsx` and
`StaffPerformanceChart.tsx` (its leaderboard chart; its per-staff timeline is a `<LineChart>`).
Delivery Performance and the Cart Funnel were confirmed to use a plain `<Table>`/custom div-bars,
not Recharts, so they were out of scope for both parts of this item, as expected. Added
`<CartesianGrid vertical={false} stroke="var(--analytics-border)" strokeOpacity={0.6} />` to both
bar charts - reusing the existing border token (already the page's "structural neutral line" color,
distinct from the tick-label muted color and the bright neutral/good/bad data hues), dimmed
slightly further via opacity. Confirmed live: 3 horizontal gridlines rendered on each bar chart,
correctly absent from both line charts (not in scope).

**Tooltip re-verification found a real, previously-undetected bug in the exact chart named in the
report.** Phase 16's tooltip fix (real name + real numeric value in the formatter) was confirmed
still correctly in place - but a fresh, from-scratch DOM-content check (not trusting the prior
"looked right" conclusion) found the RFM chart's tooltip **item** text rendered in `rgb(0, 0, 0)`
(pure black) against the tooltip's own near-black `#050505` background - effectively invisible,
despite the correct value being genuinely present in the DOM. Root cause: Recharts falls back to a
hardcoded `itemStyle.color: '#000'` default when a `<Bar>` has no single top-level `fill` prop -
which is exactly `RfmSegmentChart`'s case, since its bars are colored per-segment via child `<Cell>`
elements, not one flat `fill`. The other three tooltips on the page (`StaffPerformanceChart`'s bar,
its line, and `NetRevenueChart`'s line) happened to render correctly, but only because Recharts
opportunistically borrowed each series' own flat `fill`/`stroke` prop as an *implicit* item color -
not because any of the four had an explicit, intentional style. Fixed by adding explicit
`itemStyle={{ color: "var(--analytics-text)" }}` and `labelStyle={{ color: "var(--analytics-text)"
}}` to all four `<Tooltip>` instances, removing the reliance on that fragile fallback everywhere,
not just patching the one broken instance.

Verified via real hover DOM content (same standard as Phase 16, since this exact chart was already
claimed fixed once): reused Phase 16's `requestAnimationFrame` monkey-patch technique (this
environment's `requestAnimationFrame` never fires, so Recharts' tooltip-activation dispatch - itself
scheduled through it - never runs without the patch) to dispatch a real synthetic hover and read
`.recharts-tooltip-item`'s actual computed color/text. Before the fix: `rgb(0, 0, 0)` item color,
correct text ("Customers : 3") but invisible against the background. After: `rgb(245, 245, 245)`
(`--analytics-text`) on all four tooltips, confirmed in both English ("Customers : 3", "Orders : 5",
"Net Revenue : 51.000 JD") and Arabic ("العملاء : 3", segment label "الأبطال"/"Champions" correctly
bold above it). `tsc`/`lint` clean.

### Item 2 — Loyalty point redemption

**Investigated first, as instructed - the real answer was more nuanced than "exists" or "doesn't
exist."** A live DB query found **zero of 184 orders** have ever redeemed loyalty points, but
reading `checkout.ts`'s `placeOrder()` found the server-side redemption logic was already fully
built: it reads the real `LoyaltyConfig.redemptionValuePerPoint` (not a hardcoded rate), caps
redemption at both the customer's actual balance and the order's remaining total (never goes
negative), and already creates a `REDEEM` `LoyaltyTransaction` + decrements the balance. The feature
was real and correct - it had just never been exercised, which is exactly why two real, separate gaps
in it had never surfaced:

1. **`CheckoutForm.tsx` computed the redemption preview using a hardcoded `0.01`**, not the real
   configured rate - harmless only because the seeded `LoyaltyConfig.redemptionValuePerPoint`
   happens to already be `0.01`; if an Admin ever changed it via the already-existing Settings form,
   the checkout page's live preview would silently disagree with what actually gets charged.
2. **No surface anywhere showed the customer how much their redeemed points (or their applied store
   credit) were actually worth** - `estimatedTotal`/`order.total` silently absorbed both reductions
   with no line item, the same "invisible savings" gap Phase 16 fixed for promo-code discounts, just
   never extended to these two. Confirmed live: the admin/staff order-detail pages didn't even have
   a "Store credit applied" line (only the customer's own order page did).

**Fixes**:
- `checkout/page.tsx` now fetches the real `LoyaltyConfig` and passes `loyaltyRedemptionRate` into
  `CheckoutForm`, which uses it instead of the hardcoded `0.01`.
- New `Order.loyaltyRedemptionValue` column (migration `20260726000829_add_loyalty_redemption_value`)
  - snapshots the JD value of redeemed points at order-placement time, mirroring
  `discountTotal`/`PromoCodeUsage.discountAmount`'s existing precedent exactly: the redemption rate
  is admin-configurable and can change later, so a historical order's savings must never be
  recomputed against today's rate. Zero existing orders had `loyaltyPointsUsed > 0`, so no backfill
  was needed for this new column.
- Added a **"Loyalty points redeemed"** line (and, since it was an equally real and directly
  adjacent gap in the very same summary blocks, a **"Store credit applied"** line) to all 5 places an
  order's totals are shown: `CheckoutForm.tsx`, the confirmation page, `account/orders/[id]`,
  `admin/orders/[id]`, and `staff/orders/[id]` - both conditional, both between Discount and
  Shipping, matching the existing "Discount" row's exact treatment. **Decision on the discount-line
  question the task asked to report**: these are separate line items, not merged into the existing
  "Discount" row - `Order.discountTotal` is specifically the promo-code discount, and store credit/
  loyalty are separate, differently-sourced reductions; the account page already had a precedent
  "Store credit applied" row kept distinct from "Discount", so extending that same distinction was
  more consistent than collapsing everything into one ambiguous row.
- **Cancellation refund** (the task's explicit ask, plus the same-code-block, same-bug-class store
  credit gap found alongside it): `updateOrderStatus()`'s existing `CANCELLED` branch (which already
  restored product stock) now also reverses `storeCreditUsed` (new `StoreCreditTransaction`, reason
  `"Refunded - order cancelled"`) and `loyaltyPointsUsed` (new `LoyaltyTransaction`, type `ADJUST`,
  same note) back onto the customer's balance, in the same transaction as the status change. Chosen
  default, as the task allowed: refund in full, matching how a reversed payment would be handled.
  `CANCELLED` is a genuine terminal state (no valid transition back out of it), so this can only fire
  once per order - no double-refund path exists.

**Live end-to-end verification, not just "the config field exists now"**: logged in as a real
customer (Farah Odeh, 828 points / 15.560 JD store credit), placed a real order applying both store
credit and 300 loyalty points (`300 نقطة = 3.000 د.أ`, correctly read from the real config) - checkout
summary, confirmation page, her own order page, the admin order page, and the staff order page all
showed the identical `Subtotal → Store credit applied (-15.560) → Loyalty points redeemed (-3.000) →
Shipping → Total` breakdown, math confirmed exactly (212.000 − 15.560 − 3.000 + 2.500 = 195.940).
Cancelled the order as Admin: DB-confirmed before/after - `loyaltyPointsBalance` 528 → 828 (exactly
+300), `storeCreditBalance` 0 → 15.560 (exactly +15.560), a real `ADJUST` `LoyaltyTransaction` and a
real `StoreCreditTransaction` row, both correctly linked to the order. Confirmed the wallet page
renders both new transactions with proper translated labels ("معدّلة"/Adjusted, "مستبدلة"/Redeemed),
not raw enum text. Confirmed a customer directly `PATCH`-ing `/api/orders/[id]/status` to
self-cancel (and thus try to self-trigger a refund) still correctly gets `403` - this route's
existing `requireApiRole("ADMIN","STAFF")` guard was untouched by this work. The cancelled test order
and its real refund are left as-is, matching every prior phase's policy for a real, forward-only
state-machine outcome exercised through the real UI - reverting it would mean hand-editing state the
app itself has no path to reach.

New i18n keys: `storefront.checkout.{storeCreditApplied,loyaltyPointsRedeemed}`,
`storefront.confirmation.{storeCreditApplied,loyaltyPointsRedeemed}`,
`account.orders.detail.loyaltyPointsRedeemed`, `admin.orders.detail.{storeCreditApplied,
loyaltyPointsRedeemed}` (shared by staff via the same namespace) - en/ar, reusing the existing
"Store credit applied"/"الرصيد المستخدم" wording already shipped for the account page. `tsc`/`lint`
clean throughout.

**Environment note - a real Turbopack-stale-Prisma-Client recurrence, same category as the Phase 13
lesson but with a messier cleanup this time**: after running `prisma migrate dev` + an explicit
`prisma generate` for the new `loyaltyRedemptionValue` column, the *already-running* dev server still
threw `Unknown argument loyaltyRedemptionValue` - the regenerated client was on disk, but the live
Turbopack process still held the pre-migration client in memory. Stopping it cleanly took several
extra steps this time: `TaskStop` reported success but left the Next.js and Postgres processes (and
a Postgres `io_worker` child) genuinely still listening on both ports; `Get-Process`/
`Get-CimInstance` confirmed some of the reported PIDs were already dead while their ports remained
bound (an orphaned child inheriting the listening socket handle, matching the existing documented
`io_worker`-outlives-`taskkill`-without-`/T` pattern) - and a completely separate, unrelated second
`npm run dev` tree was also found running and had to be cleaned up too. Recovery: `taskkill /PID
<pid> /T /F` on every root, confirmed via `Get-NetTCPConnection` rather than trusting `taskkill`'s
own exit code, removed the resulting stale `.pgdata/postmaster.pid` (owning PID confirmed dead
first), cleared `.next`, restarted. Worth remembering for a future session: after any schema
migration, assume the running dev server needs a full stop/restart, not just `prisma generate` -
don't wait to hit the `Unknown argument` error first.

### Item 3 — Dark-mode date-input calendar icon

Found all 4 real `<input type="date">` sites in the app via grep (the task named 2, plus Delivery
Support's filters; the audit found a 4th, `PromoCodeForm.tsx`'s start/expiry date fields, not named
in the task). Rather than editing 4 files individually, added two global CSS rules to
`globals.css` - `.dark input[type="date"] { color-scheme: dark; }` for the site-wide toggle (covers
`DeliveryHistoryFilters`, `DeliverySupportFilters`, and `PromoCodeForm` automatically, zero
component changes) and a separate `.analytics-theme input[type="date"] { color-scheme: dark; }` for
the Analytics page's always-dark identity, which is independent of the site's own `.dark` class.

Verified live via `getComputedStyle(...).colorScheme` (not a screenshot) across all 4 surfaces and
both states: Analytics stayed `dark` with the site theme toggled to light (confirming
theme-independence held); `DeliveryHistoryFilters` (as a real driver, Khaled Fares),
`DeliverySupportFilters` (as Admin), and `PromoCodeForm` (as Admin) all correctly read `dark` when
the site toggle was on and `normal` when it was off. Restored the one account whose theme preference
was changed purely for this test (Khaled) back to its original `dark` state; the several other
theme toggles exercised during this session's verification were not individually tracked/reverted,
since a theme preference is a low-stakes, freely-reversible UI setting, not data. `tsc`/`lint` clean.

### Part 2 — QA + security pass

- **Role/ownership**: `PATCH /api/orders/[id]/status` (the route the Item 2 refund logic now runs
  through) still correctly `403`s a Customer attempting to cancel their own order directly - its
  pre-existing `requireApiRole("ADMIN","STAFF")` guard was never touched by this phase's work.
  `checkout.ts`'s `loyaltyPointsToRedeem` input was already `z.number().int().min(0)`-validated
  (from the Phase 15 hardening pass) before this phase started - confirmed still in place, not
  something this phase needed to add.
- **Cross-role verification**: the Item 2 order-total breakdown was independently confirmed
  rendering identically (same figures, same line order) on the customer's own order page, the admin
  order page, and the staff order page for the same real order - not just spot-checked on one.
- **Cross-language**: Item 1 confirmed in English and Arabic; Item 2's full order flow was placed
  and verified end-to-end in Arabic, then cross-checked in English on the admin/staff pages; Item 3
  confirmed in both languages implicitly (the fix is locale-agnostic CSS, exercised across sessions
  in both languages during the above).
- **Cross-theme**: Item 1's gridline/tooltip fixes only apply within `.analytics-theme`, confirmed
  unaffected by the site light/dark toggle (Phase 14's judgment call, re-confirmed unchanged again
  this phase); Item 3 is the dark-mode fix itself, verified in both site states; Item 2's new line
  items use the same theme-aware `text-ink-muted`/`Money` primitives as every other order-total row
  in the app, so no separate dark-mode check was needed beyond confirming they render at all (they
  do, confirmed across all 5 surfaces above).
- No new mutating API routes were added this phase (Item 2 reuses the existing `/api/checkout` and
  `/api/orders/[id]/status` routes with extended internal logic, not new endpoints), so no new
  role-sweep surface existed beyond the one re-confirmed above.
- `npx tsc --noEmit` and `npm run lint` clean after every file touched across all three items, not
  just once at the end (confirmed via the terminal history: checkpoints after each item).
- No leftover scratch files: the several standalone `tsx` diagnostic scripts used to query DB state
  (checking existing `loyaltyPointsUsed`/`storeCreditUsed` counts, before/after balances) were all
  temporary and deleted immediately after use, not committed to `scripts/`.

### Known Issues update

- The out-of-scope cart-merge/per-user-scoping bug flagged in Phase 16 (§13) was encountered again
  incidentally during this phase's live testing (a fresh cart addition combined with a pre-existing
  quantity rather than starting clean, and `localStorage.clear()` didn't fully prevent it, implying
  the server-side synced cart also plays a role) - still not investigated or fixed, still flagged as
  a standing background item, not addressed this phase since it remains unrelated to any of this
  phase's three items.
- Everything else in the running Known Issues list (i18n native-speaker review, no review-moderation
  surface, no automated test suite, the environment's screenshot/`requestAnimationFrame` limitations)
  is unchanged by this phase.

---

## §16 — Phase 19: production health signals and automated auth/checkout security QA

**Completed and verified on 2026-07-26.** This section supersedes the older statement above that no
automated test suite exists. The scope was the first three requested launch-safety items: a
database-aware health check, safe structured operational logging, and browser automation for the
highest-risk authentication, COD checkout, role, and ownership flows.

### Monitoring foundations

- Added `GET /api/health`. It performs a real database query and returns HTTP 200 with
  `status: "healthy"` only when the application and database are reachable; it returns HTTP 503
  with a deliberately generic response when the database check fails.
- Health responses are dynamic and send `Cache-Control: no-store` plus a unique `X-Request-Id`,
  making the endpoint suitable for an external uptime monitor and incident correlation.
- Added Next.js instrumentation for application startup and uncaught request errors.
- Added one-line JSON logs for health failures, rejected/rate-limited/successful logins, invalid or
  failed/successful checkouts, and notification persistence failures.
- The logger redacts sensitive keys (including authorization, cookies, credentials, tokens, email,
  phone, and address fields), limits field depth/size, and exposes only error names in production.
  Login and checkout APIs now return generic 500 responses instead of leaking unexpected internal
  error details and include `X-Request-Id`.
- Files: `src/app/api/health/route.ts`, `src/instrumentation.ts`,
  `src/lib/server/logger.ts`, `src/lib/server/request-id.ts`,
  `src/app/api/auth/login/route.ts`, `src/app/api/checkout/route.ts`, and
  `src/lib/server/services/notifications.ts`.

This establishes the application-side monitoring signals. A production hosting provider or
third-party service still needs to poll `/api/health`, collect stdout JSON logs, and alert the owner
by email/SMS. No external monitoring account, paid service, deployment, or production alert
destination was configured in this local-only phase.

### Playwright browser and security suite

- Added Playwright 1.62 and scripts: `npm run test:e2e`, `npm run test:e2e:ui`, and
  `npm run e2e:server`. Production build is run before the standard E2E command.
- Added guarded fixtures that refuse a remote database unless its database name is clearly marked
  as a test database. Local fixture users use only `@betolla.test` addresses and deterministic
  `E2E` catalog data. The fixture resets only those test users' sessions/carts and does not delete
  normal customer data.
- Automated coverage:
  - health endpoint, database reachability, no-cache header, and request ID;
  - customer registration, logout, login, and generic invalid-credential failure;
  - Admin, Staff, Delivery, and Customer redirects away from another role's area;
  - one customer cannot view or submit a return for another customer's order;
  - complete Cash on Delivery order placement in desktop Chromium and Pixel 5 mobile emulation;
  - saved order record is verified as `Cash on Delivery`;
  - a manually forged `MOCK_CARD` checkout is rejected by the server;
  - mobile checkout has no document-level horizontal overflow.
- Playwright reports, traces, screenshots, videos, and auth state are excluded from Git.
- Files: `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/support/*`,
  `e2e/auth.spec.ts`, `e2e/authorization.spec.ts`, `e2e/checkout.spec.ts`,
  `e2e/monitoring.spec.ts`, `package.json`, `package-lock.json`, and `.gitignore`.

### Verification results

- `npm exec playwright test`: **14/14 passed** (desktop Chromium plus Pixel 5 checkout coverage).
- Existing `npm test`: **9/9 passed**.
- `npm run lint`: **clean**.
- `npx tsc --noEmit --incremental false`: **clean**.
- `next build`: **production build passed**.
- The health endpoint was also observed correctly returning unhealthy while the local PostgreSQL
  process was stopped, then healthy after it restarted. This verified the failure path, not only
  the success response.
- The local development stack was restored after verification; `http://127.0.0.1:3000/api/health`
  returned HTTP 200 with the database reported as reachable.

### Outstanding launch work

- Configure the deployed host to poll `/api/health`, ingest JSON logs, and send alerts. The exact
  setup depends on the hosting provider selected.
- Configure automated PostgreSQL backups and practice a restore. Backups were not part of these
  three code changes.
- Expand E2E coverage to cancellation/stock restoration, delivery/COD collection, returns/refunds,
  promotions, loyalty/store credit, uploads, wishlists, full Arabic/RTL journeys, and the
  simultaneous-last-item inventory race.
- An independent penetration test remains recommended before handling meaningful production
  volume.
- Installing Playwright caused npm to report 16 dependency advisories (1 moderate, 15 high), but a
  detailed `npm audit` advisory query was not authorized by the execution policy because it sends
  the dependency manifest to npm. No `npm audit fix` or forced package upgrade was run.

---

## §17 — Phase 20: credential-in-URL fallback vulnerability

**Fixed and verified on 2026-07-26.**

### Finding and root cause

A real local request was observed as
`GET /login?email=...&password=...`. The JavaScript login handler already used a JSON `POST`, but
the underlying HTML `<form>` had no native `method` or `action`. If the form was submitted before
React hydration, with JavaScript disabled, or after a client-side failure, the browser used HTML's
default `GET` behavior and placed credentials in the URL. That could expose passwords through
browser history, server/access logs, analytics, monitoring systems, copied links, and screenshots.
Registration and forced password-change forms had the same unsafe fallback pattern.

### Fix

- Login now declares `method="post"` and `action="/api/auth/login"`.
- Registration now declares `method="post"` and `action="/api/auth/register"`.
- Password change now declares `method="post"` and `action="/api/auth/change-password"`.
- Added a server-only request-body helper that accepts either the existing JSON requests or native
  `application/x-www-form-urlencoded`/`multipart/form-data` form bodies.
- All three authentication endpoints keep their existing JSON behavior for hydrated React clients,
  while successful native form submissions return HTTP 303 with a relative same-origin `Location`.
  Relative redirects deliberately avoid proxy hostname mismatches and Host-header/open-redirect
  risks.
- Added a Chromium regression test with JavaScript fully disabled. It verifies all three forms have
  POST actions, performs a real native login, confirms the login request is POST, and checks every
  captured request URL for `email`, `password`, or the test password.

Files: `src/app/(auth)/login/LoginForm.tsx`,
`src/app/(auth)/register/RegisterForm.tsx`,
`src/app/change-password/ChangePasswordForm.tsx`,
`src/app/api/auth/login/route.ts`,
`src/app/api/auth/register/route.ts`,
`src/app/api/auth/change-password/route.ts`,
`src/lib/server/request-body.ts`, and `e2e/auth.spec.ts`.

### Verification

- `npm exec playwright test`: **15/15 passed**, including the JavaScript-disabled regression,
  desktop/mobile COD checkout, role boundaries, cross-customer ownership, forged-card rejection,
  health monitoring, and mobile overflow.
- `npm test`: **9/9 passed**.
- `npm run lint`: **clean**.
- `npx tsc --noEmit --incremental false`: **clean**.
- `npm run build`: **production build passed**.

Operational cleanup outside the codebase is still required for the credential already shown before
this fix: change that password if it was real or reused, clear the affected browser-history entry,
and remove/sanitize any terminal or retained access log containing the old query string.

---

## 10. QA Fix Session (2026-07-27)

Five focused fixes from a QA pass, implemented in one pass per the standing instructions for that
session.

### 10.1 — Prisma Decimal serialization crash on product pages

`getReviewableOrderItems()` (`src/lib/server/services/reviews.ts`) returned the full `OrderItem`
model, including `priceSnapshot: Decimal`, straight into the client component `WriteReviewForm`.
Fixed by adding an explicit `select: { id, order: { select: { orderNumber } } }` so only the two
fields the form actually uses ever cross the Server→Client boundary — no Decimal, no Date. No other
code changed; `WriteReviewForm`'s prop type already matched this narrower shape.

Files: `src/lib/server/services/reviews.ts`.

### 10.2 — Removed the Leaflet map picker; replaced with a full written address form

Per updated direction mid-session, the broken map-pin picker was **removed entirely** rather than
repaired (CSP fix + Leaflet invalidateSize/geolocation button were explicitly ruled out). Customers
now enter a complete written address instead of a map pin.

- **Schema (additive only):** `Address` gained `floor`, `apartmentNo`, `landmark`, `deliveryNotes`
  (all nullable). `Order` gained `shippingRecipientPhone`, `shippingDeliveryNotes` (nullable),
  captured immutably at checkout from the source `Address` so later address edits/deletes never
  change a past order's shipping record. `Address.lat`/`lng` were **left in place, unused** — no
  destructive migration. Migration: `20260727081114_add_delivery_address_fields`.
- **Validation:** new `src/lib/validation/phone.ts` — Jordanian mobile regex/normalizer (accepts
  `07[789]XXXXXXX`, `+9627...`, `00962 7...`; normalizes to `07XXXXXXXX`). Wired into
  `createAddressSchema`/`updateAddressSchema`, which also dropped `lat`/`lng` entirely and added
  `floor`/`apartmentNo`/`landmark`/`deliveryNotes` (all optional) plus the existing `buildingInfo`
  (previously in the schema but never exposed in the UI — now wired up).
- **City/governorate stays a controlled dropdown**, now sourced from the existing `ShippingZone`
  table (via a `shippingZones` prop, matching `CheckoutForm`'s existing pattern) instead of a
  duplicated hardcoded city list. **Area has no reliable predefined data anywhere in this codebase**,
  so it correctly stays a required free-text field rather than a fabricated dropdown.
- **Removed:** `src/components/MapPinPicker.tsx`, `DeliveryRouteMap.tsx`, `DeliveryRouteMapLoader.tsx`,
  and the `leaflet`/`react-leaflet`/`@types/leaflet` npm dependencies (confirmed unused elsewhere
  first). `next.config.ts`'s CSP was never touched — the OSM tile host had never actually been added,
  so there was nothing to revert.
- **UI:** `AddressFormDialog.tsx` and `CheckoutForm.tsx`'s inline new-address form both gained the
  new fields (mobile-first single-column stack, verified at 375px width). `AddressCard.tsx` displays
  the new fields. `delivery/[id]/page.tsx` dropped the map block and gained a "copy address"/"copy
  phone" affordance (new `src/components/CopyButton.tsx`, `navigator.clipboard`) plus a distinct
  delivery-notes callout. Customer/admin/staff order-detail pages now also render
  `shippingRecipientPhone`/`shippingDeliveryNotes` alongside the existing address snapshot line.
- **i18n:** removed `mapInstructions`/`noMapPin`; added governorate/floor/apartment/landmark/notes
  labels and copy-affordance strings to both `en.json` and `ar.json`.

Files: `prisma/schema.prisma`, `src/lib/validation/{address,phone}.ts`,
`src/lib/server/services/checkout.ts`, `src/app/account/addresses/{AddressFormDialog,AddressCard,page}.tsx`,
`src/app/(storefront)/checkout/CheckoutForm.tsx`, `src/app/delivery/[id]/page.tsx`,
`src/app/{account,admin,staff}/orders/[id]/page.tsx`, `src/components/CopyButton.tsx`, `package.json`,
`src/i18n/messages/{en,ar}.json`. Deleted: `src/components/{MapPinPicker,DeliveryRouteMap,DeliveryRouteMapLoader}.tsx`.

### 10.3 — Duplicated order notifications

`notify()` (`src/lib/server/services/notifications.ts`) fans out one `Notification` row per enabled
channel (IN_APP/EMAIL/SMS) for a single logical event, but every notification list page and unread
badge queried without a channel filter — so a customer with all 3 channels enabled saw "Order
placed" three times.

- Added `channel: "IN_APP"` to the `where` clause of all 4 notification list pages
  (`{account,admin,staff,delivery}/notifications/page.tsx`), all 4 layout unread-count queries
  (`{account,admin,staff,delivery}/layout.tsx`), and `read-all/route.ts`'s `updateMany` — this alone
  fixes the reported 3x duplication with no data migration, since it's a display/query-layer bug.
- Added a nullable `Notification.eventKey` column with `@@unique([userId, channel, eventKey])`
  (migration `20260727081717_add_notification_event_key`) and an optional `eventKey` param on
  `notify()`/`notifyRoles()`, switching the `createMany` call to `skipDuplicates: true`. A retried
  call with the same key is now a no-op per channel instead of a duplicate row, while distinct events
  (placed/confirmed/delivered) use distinct keys and remain separate. Wired into the order
  status-change and "order placed" notify call sites in `orders.ts`/`checkout.ts`
  (`order:${orderId}:status:${status}` / `order:${orderId}:placed`).

Files: `prisma/schema.prisma`, `src/lib/server/services/{notifications,orders,checkout}.ts`,
`src/app/{account,admin,staff,delivery}/notifications/page.tsx`,
`src/app/{account,admin,staff,delivery}/layout.tsx`, `src/app/api/notifications/read-all/route.ts`.

### 10.4 — Admin review moderation: reject/delete + star/status filters

Previously pending reviews could only be approved and published reviews could only be hidden — no
reject or permanent delete. `Review.isPublished` remains the only moderation field (no new status
enum needed: both "reject" and "delete permanently" are literal deletions, nothing needs to retain a
rejected review for audit — activity logging covers that instead).

- New `deleteReview()` in `reviews.ts`: delete + recompute the product's `avgRating`/`reviewCount`
  in one transaction, remove any uploaded review photo via the existing `deleteUploadedImage()`, and
  `logActivity()` with `REVIEW_REJECT` (was pending) or `REVIEW_DELETE` (was published).
  `PATCH .../api/admin/reviews/[id]` now also logs `REVIEW_APPROVE`/`REVIEW_HIDE` (previously
  unlogged). New `DELETE` handler, **Admin-only** (`requireApiRole("ADMIN")`, stricter than PATCH's
  existing Admin+Staff scope), verified server-side — not just hidden in the UI.
- `ReviewModerationActions.tsx` now shows two buttons per state (Approve/Reject for pending,
  Hide/Delete-permanently for published), the destructive ones behind `ConfirmDialog` with the exact
  required copy, disabled while a request is in flight, with success/error toasts.
- `admin/reviews/page.tsx` accepts `?rating=` and `?status=pending|published` search params (new
  `ReviewFilters.tsx` client component, URL-persisted, combinable), with an empty state when nothing
  matches.
- Review text was already rendered as plain text (no `dangerouslySetInnerHTML`) — confirmed still
  the case; manually verified in-browser that a comment containing `<script>`/`<img onerror>` renders
  as literal escaped text.

Files: `src/lib/server/services/reviews.ts`, `src/app/api/admin/reviews/[id]/route.ts`,
`src/app/admin/reviews/{page,ReviewModerationActions,ReviewFilters}.tsx`,
`src/i18n/messages/{en,ar}.json`.

### 10.5 — Customer order cancellation

New `POST /api/account/orders/[id]/cancel`, deliberately separate from the existing admin/staff-only
`PATCH /api/orders/[id]/status` (which customers already get 403 from). Requires `CUSTOMER` role,
verifies ownership (404 — not 403 — for another customer's order, so existence isn't leaked), rejects
non-`PENDING` orders with 400, then calls the **existing** `updateOrderStatus()` service unchanged —
no duplicated stock/wallet/loyalty/promo/payment logic. That function's own optimistic-concurrency
check (`updateMany({ where: { id, status: current.status } })`) makes a retried or racing request
fail cleanly with `OrderError` instead of double-applying restoration, which is what makes this
idempotent and race-safe against a concurrent staff confirmation.

UI: `CancelOrderButton.tsx` on the customer order-detail page, shown only for the owner's `PENDING`
order, using the existing `ConfirmDialog` component with the exact required confirmation copy.

Files: `src/app/api/account/orders/[id]/cancel/route.ts`,
`src/app/account/orders/[id]/{page,CancelOrderButton}.tsx`, `src/i18n/messages/{en,ar}.json`.

### Tests added

- `tests/validation.test.ts` — Jordanian phone normalization/validation, address required-field
  coverage for the new form fields.
- `tests/notifications.test.ts` — one event across 3 channels shows as 1 IN_APP row; unread counts
  exclude EMAIL/SMS; retried `eventKey` doesn't duplicate; distinct events for the same order stay
  distinct. (Runs directly against the local dev DB via Prisma, since `notifications.ts` imports
  `"server-only"` and can't be imported outside the Next runtime.)
- `tests/reviews.test.ts` — deleting a published review recomputes the aggregate correctly; deleting
  a pending review leaves the published aggregate untouched; star/status filter query shapes.
- `e2e/authorization.spec.ts` — only Admin (not Staff, not anonymous) can call the review `DELETE`
  route.
- `e2e/order-cancellation.spec.ts` — owner can cancel a PENDING order with stock restored exactly
  once (including on a retried request); a different customer gets 404; unauthenticated gets 401; a
  CONFIRMED order can no longer be customer-cancelled.

### Verification

- `npm test` (`tsx --test tests/**/*.test.ts`): **18/18 passed**.
- `npm run lint`: **clean**.
- `npx tsc --noEmit`: **clean**.
- `npx prisma validate`: **schema valid**.
- `npm run build`: **production build passed** (all routes compiled, including the new cancel route).
- `npx playwright test` (full suite, desktop + mobile projects): **20/20 passed**, including both new
  spec files.
- Manual in-browser verification (dev server): admin review filters (`?status=pending` correctly
  narrows the list), XSS test string renders as literal text, reject-confirmation dialog shows the
  exact required copy; customer address form (EN+AR, desktop+375px mobile) shows no map and all new
  fields with correct RTL layout; customer order cancellation exercised end-to-end (PENDING →
  Cancelled, reason recorded, button disappears); notification center confirmed showing "Order
  placed"/"Order cancelled" exactly once each despite multiple enabled channels.
- No server left running: the manual-verification dev server (`next dev`) was stopped after use. The
  project's persistent local Postgres (`embedded-postgres`, port 5433) was already running before
  this session started and was left running, as it's the standing local dev database, not a
  session-specific test server.

### Outstanding / not done

- `e2e/order-cancellation.spec.ts` and the review-deletion DB tests were not run against every edge
  case in the task's full regression list (e.g. a live two-request race for order cancellation was
  exercised sequentially, not with genuinely concurrent requests — the optimistic-concurrency
  mechanism this relies on is shared with the pre-existing admin/staff status endpoint and was not
  re-derived, only reused).
- Review photo deletion (`deleteUploadedImage` on permanent delete) was implemented and code-reviewed
  but not exercised against a review that actually has an uploaded photo in this session's manual
  pass.

### 10.6 — Final acceptance corrections

Two follow-up checks requested before acceptance:

1. **Cancel-order live update.** Reproduced in-browser (place order → cancel → observe without
   navigating): the page already updates to "Cancelled" and the Cancel button disappears on its own
   within ~1-2s via `CancelOrderButton.tsx`'s existing `router.refresh()` inside `ConfirmDialog`'s
   `startTransition` — no code change was needed here; the original spot-check that suggested a
   manual reload was required was an artifact of checking the page too quickly, not a real bug.
2. **Delivery detail screen missing a visible recipient phone.** This one was a real gap: the
   recipient's phone (`Order.shippingRecipientPhone`) was only reachable via the "Copy phone" button
   (whose visible label is the generic action text, not the number) — the number itself was never
   rendered as text. Fixed in `src/app/delivery/[id]/page.tsx` by adding a labelled
   "Recipient phone: <number>" line (new `delivery.detail.recipientPhoneLabel` i18n key, EN+AR)
   alongside the existing address/notes/copy-button block. Manually verified end-to-end (placed a
   real order against an address with floor/apartment/landmark/notes filled in, confirmed it as
   Staff, assigned a driver, and viewed the assignment as that driver): the delivery screen now shows
   the full written address — recipient name, street, building, floor, apartment, area, city,
   landmark — plus a separate "Recipient phone" line and "Delivery notes" line, at both desktop and
   375px mobile width. (A pre-existing, unrelated ~119px horizontal overflow on this page at mobile
   width was traced to the delivery layout's top `<header>` nav bar, not to this address block or any
   change made this session — left untouched per "don't change anything else.")

Also re-confirmed at this stage: `leaflet`/`react-leaflet`/`@types/leaflet` are absent from both
`package.json` and `package-lock.json` (`grep -i leaflet` on both returns nothing); `next.config.ts`'s
CSP `img-src` contains no OpenStreetMap/tile-host entry; no dev server was left running (verified via
`netstat` on port 3000 after `preview_stop`).

**Re-verification commands:** `npx tsc --noEmit` (clean), `npx eslint .` (clean), `npm test`
(**18/18 passed**, unchanged) — these were the only tests relevant to a presentation-only i18n/JSX
change; no schema, service, or API logic changed in this follow-up pass, so the full Playwright suite
was not re-run.

### 10.7 — Delivery header mobile overflow

- Fixed the delivery layout header so its identity and account controls stack/wrap below the
  `sm` breakpoint instead of forcing one fixed-width row beyond the viewport.
- Tightened mobile horizontal padding while preserving the existing desktop row layout.
- Verified the authenticated delivery dashboard at a 375x812 viewport: document and header
  `scrollWidth` are both 375px, and every header button remains inside the viewport.
- Focused verification passed: `npm run lint -- src/app/delivery/layout.tsx` and
  `npx tsc --noEmit`.

### 10.8 — Local production-data cleanup

- Created a verified physical PostgreSQL backup before deletion:
  `C:\Users\VICTUS\Desktop\betolla-db-backups\betolla-before-test-customer-cleanup-20260727-124842.tar.gz`.
- Removed 35 seeded/QA/E2E customer accounts and their 212 associated test orders in one
  transaction. Customer-owned dependent data was removed by the schema's cascades.
- Preserved `abed7elrahman@gmail.com` (3 orders) and `abed7@gmail.com` (0 orders).
- Did not target administrators, staff, delivery accounts, products, categories, bundles,
  banners, promotions, shipping zones, settings, or uploaded files.
- Recomputed all product review aggregates after the associated test reviews were removed;
  verification found zero aggregate mismatches.
- Prisma validation passed, all 11 migrations are applied, and the database schema is current.
- Created a second verified physical backup of the cleaned state:
  `C:\Users\VICTUS\Desktop\betolla-db-backups\betolla-cleaned-20260727-125146.tar.gz`.

### 10.9 — Permanent deletion for unused staff accounts

- Corrected `DELETE /api/admin/staff/[id]`: it now permanently deletes an unused staff account
  instead of silently performing another deactivation.
- Accounts with operational history (activity logs, support messages, deliveries, delivery
  reports, or orders) return HTTP 409 and must be deactivated so historical records are preserved.
- The deletion audit entry and hard delete run in one transaction.
- Updated the English and Arabic confirmation copy to describe permanent deletion and its
  history-preservation restriction accurately.
- Verification passed: focused ESLint, TypeScript, all 18 unit tests, and the production build.

### 10.10 — Staff and delivery password reset / delivery-account deletion

- Added an administrator-only password-reset endpoint and UI action for staff accounts.
- Added a staff-only password-reset endpoint and UI action for delivery accounts.
- Each reset generates a one-time temporary password, stores only its bcrypt hash, marks the
  account to require a password change at the next sign-in, revokes all active sessions, and writes
  an audit entry. The temporary password is displayed to the authorized operator once.
- Corrected delivery-account deletion to permanently delete unused delivery accounts.
- Delivery accounts with operational history (activity logs, delivery assignments, delivery
  reports, or orders) return HTTP 409 and must be deactivated instead, preserving business records.
- Updated the English and Arabic interfaces and confirmation copy for both roles.
- No Prisma schema change or database migration was required.
- Verification passed: ESLint, TypeScript, all 18 unit tests, and the production build.

### 10.11 — Admin/staff delivery-terminal synchronization

- Corrected the admin/staff order-status workflow so marking an order `DELIVERED` also marks its
  active delivery assignment `DELIVERED` in the same serializable database transaction.
- The synchronized assignment records its delivery timestamp and delivery earnings, preventing the
  driver dashboard, history, collections, and analytics from disagreeing with the order.
- Delivery detail pages now refresh every five seconds while an assignment is active, so an
  administrator or staff status change appears without requiring the driver to reload manually.
- Pickup/failure/report controls are hidden as soon as either the order or assignment is terminal,
  preventing impossible API requests from stale browser screens.
- A one-time production reconciliation query is included in the deployment procedure for assignments
  that were already left active while their orders were delivered or cancelled.
- Verification passed: ESLint, TypeScript, all 18 unit tests, and the production build.

## 11. Local content, pharmacy, contact, popup, and audit expansion (28 July 2026)

Implemented locally only. Nothing in this section has been copied to the Ubuntu production server;
production deployment is intentionally deferred until manual acceptance testing.

### 11.1 Additive database design and migrations

- Added `CustomerType` (`INDIVIDUAL`, `PHARMACY`) without changing the existing role model.
  Pharmacies remain `CUSTOMER` accounts, so they use the same secure storefront/account/checkout
  permissions rather than creating a new privileged role.
- Added optional pharmacy name/location fields to `User`; pharmacy registration generates a unique
  internal username while the customer signs in with email/password.
- Added relational models for `SiteSettings`, `StaticPage`, `BlogPost`, `Faq`, `PopupCampaign`, and
  one-to-one `ProductKnowledge`.
- Added ten popup templates: Sale, Announcement, New Product, Welcome, Limited Time, Free Shipping,
  Loyalty, Back in Stock, Event, and Custom.
- Applied two additive migrations:
  `20260728120000_add_content_pharmacy_and_marketing` and
  `20260728121000_seed_site_content_defaults`.
- Seeded editable bilingual Privacy Policy and About Us starting content with conflict-safe inserts.
- No schema reset, destructive migration, or existing business-record deletion was used.

### 11.2 Storefront and registration

- Added responsive Blog and Contact Us navigation links. When a WhatsApp number is configured,
  Contact Us opens `wa.me/<international-number>`; until then it safely falls back to the About page.
- Added accessible WhatsApp, Instagram, Facebook, and LinkedIn footer icons. Empty settings hide
  their respective icons; external links open with `noopener noreferrer`.
- Added Blog listing/detail, Privacy Policy, About Us, FAQ, and product-facts public routes.
- Added the product-detail `Know more about this product` button and bilingual rich-content page.
- Added individual/pharmacy selection to registration. Pharmacy fields are pharmacy name, email,
  location, and password; the account is authenticated exactly like any other customer.
- Privacy consent is required by both client and server validation. The policy link uses normal
  same-tab navigation. Returning with browser/phone Back restores every field, including password,
  from memory; the password is never written to sessionStorage/localStorage. Only non-sensitive
  draft fields have a storage fallback.
- Added a responsive customer popup renderer that displays the newest eligible active campaign once
  per browser session and respects optional start/end dates and CTA links.

### 11.3 Admin and staff management

- Admin and Staff can create, edit, publish/unpublish, and delete bilingual Blog posts with HTML
  bodies.
- Admin Site Content management covers WhatsApp/social links, Privacy Policy, About Us, FAQs, and
  popup campaigns.
- FAQs support bilingual HTML answers, order, visibility, edit, and permanent deletion.
- Popups support bilingual title, announcement, HTML body, optional CTA, optional schedule, active
  status, and all ten visual templates.
- Product create/edit forms for both Admin and Staff now manage bilingual product-facts HTML. Clearing
  both bodies deletes the one-to-one record; the customer button appears only while it is active.
- Added admin-only Staff Footprint cards and per-staff audit detail pages. The detail view defaults
  to the last 30 days and filters by exact action and date range, showing up to 500 audit records
  with recorded before/after details.
- New content actions write `ActivityLog` entries (`BLOG_*`, `FAQ_*`, `POPUP_*`,
  `STATIC_PAGE_UPDATE`, `SITE_SETTINGS_UPDATE`, and `PRODUCT_KNOWLEDGE_*`).
- Staff cannot open Staff Footprint; live verification confirmed redirection back to `/staff`.

### 11.4 Rich-HTML and notification security

- Added `sanitize-html` plus TypeScript definitions.
- Blog, FAQ, popup, static-page, and product-facts HTML is sanitized on the server before persistence.
  Scripts, event handlers, iframes, forms, unsafe schemes such as `javascript:`, and unsupported
  embeds are removed. External `_blank` links receive `noopener noreferrer`.
- Route authorization is explicit: Blog/Product Knowledge accepts ADMIN or STAFF; site links, static
  pages, FAQ, popup, and Staff Footprint are ADMIN-only.
- Removed SMS from registration defaults, managed-account defaults, preference reads/writes, and all
  customer preference UI. Existing SMS preference rows were deleted by migration; historical
  notification records and the enum value remain for database/audit compatibility.
- Notification dispatch explicitly excludes SMS even if a legacy row is reintroduced.
- Push now includes a visible explanation: it means a browser/device notification after user
  permission. Betolla currently records the preference only; real push delivery still requires a
  service worker, VAPID/provider integration, and production HTTPS.

### 11.5 Responsive corrections

- Storefront header navigation wraps/scrolls safely with Products, Bundles, Blog, and Contact Us.
- Verified the storefront, registration, popup, product facts, FAQ, account preferences, and
  Staff Footprint at a 390px requested mobile viewport (375px effective): no document-level
  horizontal overflow.
- Browser testing found a pre-existing Staff layout header overflow while validating the new Staff
  Blog page. The Staff header now stacks/wraps below `sm`, matching the Admin/Delivery responsive
  pattern; final measured width and scroll width are both 375px.

### 11.6 Verification and cleanup

- `npm run lint`: clean.
- `npx tsc --noEmit`: clean.
- `npm test`: **23/23 passed** (18 prior tests + 5 focused registration/content/security tests).
- `npm run build`: production build passed; all 102 pages/routes generated or compiled.
- `npm run test:e2e`: **20/20 passed** across desktop Chromium and mobile Chromium.
- Updated the registration E2E test to accept the now-required Privacy Policy.
- Live browser verification covered:
  - pharmacy registration, auto sign-in, and privacy Back-navigation field preservation;
  - Admin Blog/FAQ/Popup/Product Knowledge creation and sanitized public rendering;
  - Staff Blog creation permission;
  - Admin-only Staff Footprint access plus action/date filtering;
  - social/WhatsApp settings and exact generated links;
  - SMS absence and Push explanation;
  - customer popup display/dismissal and mobile widths.
- Malicious test HTML was verified absent from rendered public markup.
- Removed all temporary accounts, posts, FAQs, popups, product facts, dynamic registration users, and
  test-run orders created during this pass. Restored the E2E product to its pre-test stock of 494.
  Verified zero remaining Codex feature-test content/users and zero SMS preference rows.
- Final local health check: `GET http://127.0.0.1:3000/api/health` returned healthy with database
  reachable. The final local production build and embedded PostgreSQL are intentionally left running
  for manual acceptance testing.

### 11.7 Configuration still required before production deployment

- Enter the real WhatsApp number and Instagram/Facebook/LinkedIn URLs in
  **Admin Dashboard → Site Content**.
- Replace/review the starter Privacy Policy and About Us text with company-approved wording.
- Real web-push notifications are not implemented; the Push preference is presently stored but no
  provider sends it.
- After manual acceptance, upload the code and run `npx prisma migrate deploy` on the Ubuntu server.
  Do not run `prisma migrate reset` and do not run the large development seed in production.

## 12. Local banner, footprint, navigation, and localhost corrections (29 July 2026)

Implemented and verified locally only. The Ubuntu production server has not been changed.

### 12.1 Localhost SSL-console correction

- Traced the repeated `ERR_SSL_PROTOCOL_ERROR` console entries to the production-build CSP applying
  `upgrade-insecure-requests` while the local preview was served over plain
  `http://127.0.0.1:3000`.
- `upgrade-insecure-requests` and HSTS are now enabled only when both the build is production and
  `NEXT_PUBLIC_APP_URL` is HTTPS. This keeps the protections on the real HTTPS deployment without
  asking localhost to speak HTTPS.
- The rebuilt localhost response contains neither HSTS nor `upgrade-insecure-requests`; a fresh
  browser tab recorded zero console errors.

### 12.2 Business-readable Staff Footprint

- Replaced internal action codes and raw JSON with plain-language descriptions, readable changes,
  and direct “Review this record” links where a matching Admin page exists.
- The filter now says “What the staff member did” and lists only friendly labels that actually occur
  in the selected period.
- Routine delivery-account updates/deletions, driver assignment, support assignment, and incomplete
  support-status noise are excluded.
- Order status events appear only when the order was cancelled.
- Customer and delivery support work appears as “Support handled” only when the ticket/report is
  resolved or closed, allowing the administrator to review completed work.
- Staff summary cards count only these important actions, not hidden operational noise.

### 12.3 YouTube homepage banners

- Added `YOUTUBE` to `BannerMediaType` through additive migration
  `20260729090000_add_youtube_banner_media`.
- Admin can now select **YouTube link**, paste a normal watch/share/Shorts/live/embed URL, and see an
  immediate preview without uploading a video or using an API key.
- Server validation accepts only HTTPS links from known YouTube hosts, extracts an exact 11-character
  video ID, and persists a normalized URL. Arbitrary iframe URLs are rejected.
- Storefront playback uses `youtube-nocookie.com`, is muted/looping/inline, respects reduced-motion
  autoplay preferences, and does not intercept banner CTA clicks.
- CSP permits only the standard YouTube and privacy-enhanced YouTube frame origins.

### 12.4 Mobile storefront hamburger

- At phone widths, the header now keeps only the Betolla logo, cart, hamburger button, and full-width
  search field visible.
- Products, Bundles, Blog, Contact Us, theme, language, account/orders, sign-in, and sign-out actions
  are inside the accessible swipeable hamburger drawer.
- Desktop navigation remains inline and unchanged.
- Live 390×844 verification measured `clientWidth = 390` and `scrollWidth = 390`, confirming no
  document-level horizontal overflow.

### 12.5 Verification and cleanup

- Prisma format/client generation passed; all **14 migrations** are applied locally.
- `npm run lint`: clean.
- `npx tsc --noEmit --incremental false`: clean.
- `npm test`: **25/25 passed**.
- `npm run build`: passed; all 102 application routes/pages compiled.
- `npx playwright test`: **20/20 passed** across desktop and mobile Chromium.
- Live browser checks covered the new hamburger, footprint cards/detail/filter language, YouTube
  selection/preview/save/storefront rendering, local CSP, and a clean fresh-tab console.
- Removed the temporary YouTube banner, its audit row, the current E2E run's seven orders and dynamic
  registration account, and earlier placeholder social/WhatsApp test links. Existing catalog and
  business records were preserved; E2E product stock remains at its pre-pass value of 494.
- Final local health endpoint reports the application healthy and the database reachable.

## 13. Popup campaign center, page triggers, media, and customer targeting (29 July 2026)

Implemented and verified locally only. The Ubuntu production server has not been changed.

### 13.1 Dedicated multi-campaign administration

- Moved popup management into its own **Admin Dashboard -> Popups** section rather than treating it
  as one field inside Site Content.
- Admin can create, edit, schedule, activate/deactivate, and permanently delete multiple independent
  popup campaigns. The campaign list shows the design, page trigger, audience, and customer filter.
- Added ten clearly selectable visual starting templates with editable bilingual starter copy:
  Sale, Announcement, New Product, Welcome, Limited Time, Free Shipping, Loyalty Reward,
  Back in Stock, Event, and Custom.
- Added a live English preview so a non-technical administrator can see the selected design and
  wording before saving it.

### 13.2 Page triggers and uploaded images

- Added a readable **When should it appear?** dropdown with triggers for all storefront pages,
  homepage, product catalog, product details, cart, checkout, blog, and bundles.
- A campaign is evaluated against the current storefront route; for example, a Cart campaign does
  not appear on the homepage.
- Added an optional campaign image upload. Admin guidance specifies a **16:9** ratio and
  **1200 x 675 px** preferred size.
- Popup images reuse the secured upload pipeline: Admin-only authorization, JPEG/PNG/WebP validation,
  an 8 MB limit, image decoding through Sharp, resizing, conversion to WebP, storage quota
  enforcement, and old-file cleanup after replacement or campaign deletion.
- Storefront rendering preserves the image at 16:9 and provides responsive modal sizing and
  accessible close controls.

### 13.3 Customer type and business-segment targeting

- Added a **Who should see it?** selector:
  - All visitors and customers;
  - Individual customers only;
  - Pharmacies only.
- Added a **Customer filter** selector:
  - everyone in the chosen audience;
  - best 30% by lifetime spending;
  - lowest 30% by lifetime spending;
  - new accounts created during the last 30 days;
  - inactive customers with no order in the last 90 days, excluding brand-new accounts.
- Top/lowest ranking is calculated only within the selected account type. A pharmacy campaign ranks
  pharmacies against pharmacies; an individual campaign ranks individual customers against
  individual customers.
- Non-basic customer filters require sign-in. The Admin form now explains that anonymous visitors
  cannot receive a spending/activity-targeted campaign.
- Eligibility is calculated on the server from authenticated account type and CustomerStats. The
  browser receives only campaigns that the current visitor is eligible to see, preventing
  client-side inspection of campaigns intended for another customer group.
- Customer population ranking is loaded only when a top/lowest-spender campaign needs it; ordinary
  campaigns use a single-customer lookup.

### 13.4 Database and verification

- Added and applied two additive, non-destructive migrations:
  `20260729100000_add_popup_targeting_and_images` and
  `20260729103000_add_popup_audience_targeting`.
- Prisma client generation and migration deployment passed; **16 migrations** are applied locally.
- `npm run lint`: clean.
- `npx tsc --noEmit --incremental false`: clean.
- `npm test`: **28/28 passed**, including popup validation, route-trigger matching, account-type
  separation, and customer-segment calculations.
- `npm run build`: passed; all **103** application routes/pages compiled.
- `npm run test:e2e`: **21/21 passed** across desktop and mobile Chromium, including the
  post-build runtime-upload regression.
- Live browser verification confirmed:
  - all ten templates and their descriptions are visible;
  - page, customer-type, and customer-filter dropdowns save and reload correctly;
  - a Pharmacy/Best-30% Cart campaign is not disclosed to an ineligible Admin session;
  - restoring the same campaign to Everyone/All makes it appear on the Cart page;
  - the mobile customer popup has no document-level horizontal overflow at 390 x 844;
  - its uploaded image frame measures 1.78:1, matching 16:9.
- Deleted the temporary verification popup and its uploaded WebP after testing. Existing business
  campaigns and production data were not changed.

### 13.5 Runtime-upload image delivery correction

- Reproduced the customer-reported broken popup image against the production-style local server.
  The upload itself succeeded and the optimized WebP existed on disk, but a direct request to its
  `/uploads/popups/<filename>.webp` URL returned `404`.
- Root cause: Next.js builds its public static-file manifest during `next build`; files uploaded
  afterward are not automatically discovered by `next start`.
- Added the dynamic `/uploads/[subfolder]/[filename]` serving route for public runtime uploads.
  It accepts only the approved public folders (`products`, `avatars`, `reviews`, `banners`, and
  `popups`), rejects path traversal/unknown folders and unsupported extensions, returns an exact
  content type with `nosniff`, and uses immutable caching for generated filenames.
- Popup WebP files are already resized and optimized during upload, so the customer popup now loads
  them directly rather than sending them through the Next image optimizer a second time.
- Live verification against the exact previously broken WebP changed its result from
  `404 text/html` to `200 image/webp` with the full 80,668-byte response. Unknown files and the
  private `delivery-reports` folder remained `404`.
- Added a production-build regression test that signs in as the E2E administrator, uploads a PNG
  after the server has started, confirms the returned WebP URL is immediately readable, and removes
  both the temporary file and quota row afterward.
- Browser verification confirmed the popup image renders visually on desktop and mobile, and the
  375px effective mobile viewport remains free of document-level horizontal overflow.
