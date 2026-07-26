# Arabic Translation Review Log

Running log of every Arabic string flagged during the i18n retrofit as needing native-speaker
review before shipping to real Arabic-speaking users — not because it's wrong, but because it's
in a category where a non-native pass has genuine uncertainty. See `PROGRESS.md` §9 for the
overall retrofit plan and batching order.

**Register**: Formal Modern Standard Arabic (فصحى) throughout, matching the existing seed-data
precedent (`prisma/seed-data/categories.ts` etc.) and the original 21-key `ar.json`. All system
chrome uses this register; flag any string below where a warmer/more colloquial Jordanian tone
might actually be wanted instead (marketing copy is the most likely candidate, not yet reached in
this batch).

**Numeral convention**: Western digits (١٢٣ Arabic-Indic digits are NOT used), matching the
existing `ar.json`/`ShippingZone.cityAr` precedent and standard Jordanian commercial UI practice.
One-time convention call, not per-string.

---

## Batch 1: Storefront + Auth

### ICU plural forms (Arabic's 6-way zero/one/two/few/many/other system)

Arabic numeral-noun agreement is genuinely one of the more complex areas of the grammar (the noun
takes a different form after "few"/3-10 vs. "many"/11-99 vs. "other"/100+ or round hundreds) — all
of the following are my best-effort application of standard MSA agreement rules, but every one
should get a native-speaker sanity check before shipping to production, not just a "does it
render" check:

- `storefront.products.productCount` — "{count} products" → 6-form plural (منتج/منتجان/منتجات/منتجًا).
- `storefront.productDetail.onlyLeftInStock` — "Only {count} left in stock" → 6-form plural
  (قطعة/قطعتان/قطع/قطعة). Note the "many" and "other" forms both render "تبقّت # قطعة فقط" — this
  is intentional (both take the same singular-accusative noun form per standard MSA numeral rules
  for 11-99 and 100+), not a copy-paste omission, but worth double-checking against how a native
  speaker would actually phrase a stock-count warning in a shopping UI.
- `storefront.checkout.redeemLoyaltyPoints` and `pointsEqualsValue` — "{count} points (available)"
  / "{count} points = {value}" → 6-form plural (نقطة/نقطتان/نقاط/نقطة). These are the most
  syntactically complex strings in this batch (plural noun agreement combined with an embedded
  rich `{value}`/count placeholder) — flag for extra scrutiny.

### Other flagged items

- `common.currencyUnit`: "د.أ" (the standard Jordanian Dinar abbreviation) chosen over spelling out
  "دينار أردني" in full, to keep prices compact next to a number the way "JD" does in English. Flag
  in case a fuller form is actually preferred in a financial/checkout context specifically.
- `storefront.productDetail.rateOutOf5`: "قيّم {value} من 5" (Rate {value} out of 5) — the number 5
  itself doesn't inflect grammatically here since it's inside an aria-label read by a screen reader,
  not visible body text, but flag since "من 5" (out of 5) phrasing for a star-rating specifically
  is a UI convention choice, not a fixed correct/incorrect translation.
- `storefront.checkout.paymentMethodNote`: kept "HyperPay"/"PayTabs" (proper nouns/brand names)
  untranslated/untransliterated, matching how the English original treats them as brand names, not
  descriptive text.

### Confirmed reused directly (not new translation work, just noting for completeness)

- `common.brand`, `theme.*`, `language.*` — all 21 pre-existing keys reused as-is from the original
  skeleton catalog, already shipped and presumably already reviewed when first written.

No marketing-flavored copy was reached in this batch (Batch 1 is transactional/functional UI
strings only) — the register question will come up for real once any promotional banner/hero copy
is migrated in a later batch, if any exists.

---

## Batch 2: Account hub

No new ICU plural forms beyond the same 6-form pattern already established in Batch 1 (loyalty
points, item counts, order counts). Nothing new flagged in this batch — primarily transactional UI
(orders, wallet, addresses, wishlists, preferences, sessions, support), same register as Batch 1.

---

## Batch 3: Admin dashboard

### Register/terminology choices needing a native-speaker sanity check

- `common.rfmSegment.*` — the 7 RFM/CRM segment names (Champions/Loyal/Potential Loyalist/New
  Customer/Needs Attention/At Risk/Lost) are CRM jargon with no single settled Arabic translation
  in common commercial use. Current choices (الأبطال/الموالون/موالٍ محتمل/عميل جديد/يحتاج إلى
  متابعة/معرّض للخطر/مفقود) are reasonable literal-ish renderings but flagged since a
  marketing/CRM team might prefer different established terms, especially "الأبطال" (Champions,
  literally "the heroes") which reads a bit informal for what's otherwise a formal-register admin
  tool.
- `admin.analytics.extendedHeading` — originally hardcoded as "Phase 13 Additions" in the English
  source (leftover internal dev-phase naming, not meant to ship). Changed to "Extended Analytics" /
  "تحليلات موسّعة" as a judgment call during the retrofit rather than translating the literal
  internal phrase — flag in case a different heading is wanted once item 6 (analytics redesign)
  restructures this section anyway.

### ICU plural forms (6-way Arabic agreement) — new in this batch

- `admin.analytics.rfm.unsegmentedNote`, `.recalculate.recalculated`, `.staffPerformance.ordersProcessedTooltip`,
  `.cartFunnel.abandonedCartCount`, `common.customersCount`, `common.ordersCount` — all follow the
  same zero/one/two/few/many/other pattern as Batch 1, same confidence level (best-effort applied
  CLDR rules, not native-verified).
- `admin.abandonedCarts.summary` — the most syntactically complex ICU string in the whole retrofit:
  a full sentence with subject-verb-object agreement varying by count ("X customer(s) left items in
  their cart..."), not just a noun-count. Flag this one specifically for extra scrutiny — getting
  the verb form ("ترك" vs "تركا" vs "تركوا") right across all 6 categories in a full sentence is
  meaningfully harder than pluralizing a bare noun.
- `admin.analytics.cohortRetention.monthOffsetHeader` ("+{n}شهر") — a compact table-header
  convention (no plural forms, always uses the bare noun "شهر" regardless of n) chosen to match the
  terse English "+{n}mo" column-header style rather than a fully-agreed phrase. Flag as a
  deliberate compactness-over-grammar tradeoff for a column header, not an oversight.

### Numeral/unit conventions

- `admin.analytics.salesHeatmap.timeBlocks.*` (e.g. "12–4ص", "4–8ص") — uses Western digits +
  Arabic AM/PM letters (ص/ظ/م) rather than a fully-formatted 12-hour time via Intl, to keep the
  compact table-header style. Flag as a convention choice; a native speaker may prefer a different
  compact notation for time-of-day ranges in Arabic commercial UI.

---

## Batch 4: Staff + delivery dashboards

Both batches reuse the same shared `common.*` and `admin.*` catalogs already flagged above (RFM
segments, delivery problem/urgency types, order/ticket/delivery status enums) — no new
register/plural questions introduced. `delivery.statusActions.nextStatus.*` (Mark Picked
Up/Mark En Route/Mark Delivered) and `delivery.reportProblemDialog.*` are new but purely
transactional, same formal register as everything else.

---

## Post-retrofit live QA fixes (not translation-quality flags, but worth recording)

During a full live-browser verification pass across all 4 roles in both locales after the code
migration was complete, the following were found and fixed (implementation bugs, not translation
wording issues — listed here for a complete record of what touched the message catalogs):

- `auth.login.welcomeBack` / `auth.register.join` contain a `{brand}` ICU placeholder that the
  calling components (`LoginForm.tsx`, `RegisterForm.tsx`) never supplied, causing next-intl to
  render the literal untranslated key path on screen. Fixed by passing `{ brand: tCommon("brand") }`
  at both call sites. A full codebase sweep for the same bug class (message expects a placeholder,
  call site doesn't supply it) found no other instances.
- `ThemeToggle.tsx`'s aria-label and visible "Light"/"Dark" text label were hardcoded English,
  never wired to `theme.switchToLight`/`switchToDark`/`light`/`dark` despite those keys already
  existing in the catalog from the very first infra batch. Fixed.
- `ConfirmDialog.tsx`'s `cancelLabel`/`confirmLabel` prop defaults and its "Working..." pending-state
  text were hardcoded English, silently used at every call site across the app that didn't
  explicitly override `cancelLabel` (nearly all of them). Fixed via `common.cancel`/`common.confirm`/
  new `common.working` fallbacks.
- `admin/users/[id]/page.tsx`'s wallet-history section rendered `LoyaltyTransaction.type` (EARN/
  REDEEM/ADJUSTED) raw when no `note` was present, instead of routing through the
  `account.wallet.txType.*` labels already built for the customer-facing wallet page. Fixed.
- `src/components/ImageUploader.tsx` (all three exported uploaders — product main photo, gallery,
  delivery-report photo) was missed entirely by the retrofit — every button label, the "Uploading..."
  state, and image alt text were hardcoded English. New `common.imageUploader.*` namespace added and
  wired in.
- `src/components/MapPinPicker.tsx`'s map-instruction caption ("Click the map to drop a pin...") was
  hardcoded English; wired to `account.addresses.form.mapInstructions`.
- `src/lib/server/services/wishlists.ts`'s `getOrCreateDefaultWishlist()` wrote the literal string
  "My Wishlist" into the database for every new customer's first wishlist regardless of locale.
  Fixed to call `getTranslations("account.wishlists")` server-side and use `defaultListName`. Note:
  this only affects wishlists created from this point forward — already-seeded/existing customer
  wishlists keep their persisted English name (expected; not retroactively fixable without a data
  migration, and out of scope for this pass).
- `src/i18n/messages/ar.json`'s `admin.analytics.salesHeatmap.timeBlocks.*` initially used
  Arabic-Indic digits (١٢–٤ص), breaking the project's established Western-digit convention
  (documented above and enforced everywhere else via `-u-nu-latn`). Fixed to Western digits.

All of the above were caught via a genuine logged-in, both-locale, all-4-role browser walkthrough
(not just a static code read) — see `PROGRESS.md` for the fuller batch-by-batch write-up.

---

## Batch 5: Phase 14 — new domain-specific copy

New Arabic strings introduced by Phase 14 (see `PROGRESS.md` §11), flagged for the same
native-speaker review the earlier batches never got, not because any of them are believed wrong.

- **"Today's Collections" → "التحصيلات" (nav) / "تحصيلات اليوم" (page heading)** — this is genuinely
  new business vocabulary (a driver's end-of-day cash reconciliation with the accountant), not a
  translation of existing English UI copy, so there's no prior precedent to lean on. "تحصيلات" is
  the standard commercial-Arabic term for "collections" (money collected), but flag in case a more
  colloquial Jordanian phrasing (e.g. something closer to "cash on hand") would read more naturally
  to an actual driver than this more formal-register choice.
- **`account.orders.reviewDialog.*` / `account.orders.deliveryRatingDialog.*`** — "أضف تقييمًا" (add
  a rating/review) and "قيّم عملية التوصيل" (rate the delivery experience) are both direct,
  functional translations matching the existing `storefront.reviews.writeReview` precedent
  ("أضف تقييمًا") for consistency between the two review-entry surfaces. Flag "قيّم عملية التوصيل"
  specifically — "عملية التوصيل" (literally "the delivery process/operation") is a slightly formal
  way to say "your delivery"; a more casual "قيّم توصيلك" might read more naturally in a
  customer-facing action button, but formal register was kept to match the rest of the app's
  established system-chrome register (per this file's own opening convention note).
- **Category names, product/bundle Arabic content itself (Item A1)** — no new translation work was
  done here (the seed data's existing `nameAr`/`descriptionAr` values were already in place, just
  newly *displayed* correctly); flagging only that these were never spot-checked against this file's
  register/terminology conventions before this phase, since the bug being fixed was purely a
  read-path bug, not a content-authoring task. Worth a pass alongside a future native-speaker review
  of everything else in this file.

No Arabic-Indic-numeral or plural-form issues were introduced this batch — the new strings are
either plain labels or ICU-plural-free sentences, unlike several of the earlier batches' more
grammatically complex strings.

---

## Batch 6: Phase 16 — discount visibility, analytics fixes, COD accrual, notification badges,
## driver-guard alerts

New Arabic strings introduced by Phase 16 (see `PROGRESS.md` for the full write-up), flagged for
the same native-speaker review every prior batch has never received.

- **`admin.analytics.netRevenue.description`** — "المجموع الفرعي مطروحًا منه الخصومات والمبالغ
  المستردة، يوميًا (ليس رقم ربح حقيقي - هذا التطبيق لا يتتبع تكلفة المنتج)." is new, fairly technical
  domain vocabulary (an accounting-adjacent honesty caveat explaining why this isn't a true profit
  figure) with no prior precedent in this app's catalog to lean on, similar in kind to the
  CLV-honesty caveat from Phase 11/13 (`topCustomers.description`). Flag specifically for whether
  this register of caveat-explanation reads naturally to a Jordanian business owner or comes across
  as overly literal/translated.
- **`admin.orders.detail.noDriverAlert`** — "لم يتم تعيين سائق توصيل بعد - عيّن سائقًا لإبقاء هذا
  الطلب متقدّمًا." (No delivery driver assigned yet - assign one to keep this order moving.) A
  direct, functional translation; flag only the closing clause "لإبقاء هذا الطلب متقدّمًا" (literally
  "to keep this order advancing/moving forward") - a more natural Jordanian commercial-Arabic phrasing
  for "keep this order moving" may exist that reads less like a literal English-to-Arabic transfer.
- **`admin.ordersShared.noDriverBadge`** — "بلا سائق" (No driver) - a short, compact table-badge
  label, same register/brevity tradeoff already flagged for other compact badge/column labels
  elsewhere in this file (e.g. the sales-heatmap time-block headers) - not a full sentence, chosen to
  fit inline next to the existing status badge.
- **`common.notifications.allCategories`** — "الكل" (All) - a plain, unambiguous one-word label; no
  register concern.
- **`storefront.checkout.discount` / `storefront.confirmation.discount`** — "الخصم" (Discount) -
  reused verbatim from the already-shipped `account.orders.detail.discount` /
  `admin.orders.detail.discount` keys (Batch 1/3), not new translation work - flagging only for
  completeness of this batch's record, not because it's uncertain.
- **`admin.analytics.rfm.customersLabel` / `admin.analytics.staffPerformance.ordersLabel`** —
  "العملاء" (Customers) / "الطلبات" (Orders) - both are existing, already-reviewed vocabulary
  reused as short tooltip-item labels (part of fixing the RFM/staff-performance chart tooltip bug,
  see PROGRESS.md), not new translation decisions.

No ICU plural forms or Arabic-Indic-numeral issues were introduced this batch — every new string is
either a plain label or a single non-pluralized sentence.

---

## Batch 7: Phase 18 — loyalty point redemption line items

New Arabic strings introduced by Phase 18 (see `PROGRESS.md` §15 for the full write-up).

- **`loyaltyPointsRedeemed`** (shared wording across `storefront.checkout`, `storefront.confirmation`,
  `account.orders.detail`, `admin.orders.detail`) — "نقاط الولاء المستبدلة" (literally "the redeemed
  loyalty points") is genuinely new translation work, not reused from elsewhere in the catalog (unlike
  `storeCreditApplied`, added alongside it, which reuses the exact wording already shipped for
  `account.orders.detail.storeCreditApplied` in Batch 1/3). Flag for a native-speaker check on two
  points: (1) whether "المستبدلة" (feminine-singular agreement with the plural non-human noun "نقاط",
  per standard MSA rules) reads naturally in a compact order-summary row the way "Loyalty points
  redeemed" does in English, and (2) whether this phrasing is consistent with
  `storefront.checkout.redeemLoyaltyPoints`'s existing verb choice ("استبدال") from Batch 1 - both
  use the same root deliberately, but this is the first time it appears as a past-participle line-item
  label rather than an action-button label, so it's worth confirming the shift in grammatical role
  still reads correctly.

No ICU plural forms or Arabic-Indic-numeral issues were introduced this batch.
