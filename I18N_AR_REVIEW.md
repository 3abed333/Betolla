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
