import assert from "node:assert/strict";
import test from "node:test";
import { checkoutSchema } from "../src/lib/validation/checkout";
import { createAddressSchema, updateAddressSchema } from "../src/lib/validation/address";
import { normalizeJordanianPhone } from "../src/lib/validation/phone";
import { createTicketSchema } from "../src/lib/validation/support";
import { createReturnSchema } from "../src/lib/validation/return";

const checkout = {
  items: [{ kind: "product" as const, id: "product-1", quantity: 2 }],
  shippingAddressId: "address-1",
  paymentMethodType: "CASH_ON_DELIVERY" as const,
  useStoreCredit: false,
  loyaltyPointsToRedeem: 0,
  idempotencyKey: "4dce416e-6399-41ee-855a-bf26612ed5f1",
};

test("checkout requires an idempotency key and positive bounded quantities", () => {
  assert.equal(checkoutSchema.safeParse(checkout).success, true);
  assert.equal(checkoutSchema.safeParse({ ...checkout, idempotencyKey: "not-a-uuid" }).success, false);
  assert.equal(checkoutSchema.safeParse({ ...checkout, items: [{ ...checkout.items[0], quantity: 0 }] }).success, false);
});

test("checkout accepts Cash on Delivery only", () => {
  assert.equal(checkoutSchema.safeParse(checkout).success, true);
  assert.equal(checkoutSchema.safeParse({ ...checkout, paymentMethodType: "MOCK_CARD" }).success, false);
});

test("gift checkout requires a supported occasion and bounds personal fields", () => {
  assert.equal(
    checkoutSchema.safeParse({
      ...checkout,
      isGift: true,
      giftOccasion: "BIRTHDAY",
      giftRecipientName: "Lina",
      giftMessage: "Happy birthday!",
    }).success,
    true,
  );
  assert.equal(checkoutSchema.safeParse({ ...checkout, isGift: true }).success, false);
  assert.equal(
    checkoutSchema.safeParse({
      ...checkout,
      isGift: true,
      giftOccasion: "BIRTHDAY",
      giftMessage: "x".repeat(501),
    }).success,
    false,
  );
});

test("address creation is complete while address editing may be partial", () => {
  const address = {
    label: "Home",
    recipientName: "A Customer",
    phone: "0790000000",
    city: "Amman",
    area: "Shmeisani",
    street: "Main Street",
  };
  assert.equal(createAddressSchema.safeParse(address).success, true);
  assert.equal(updateAddressSchema.safeParse({ street: "Second Street" }).success, true);
  assert.equal(updateAddressSchema.safeParse({}).success, false);
});

test("address creation requires governorate/city, area, street, recipient name and phone", () => {
  const base = {
    label: "Home",
    recipientName: "A Customer",
    phone: "0790000000",
    city: "Amman",
    area: "Shmeisani",
    street: "Main Street",
  };
  for (const key of ["recipientName", "phone", "city", "area", "street"] as const) {
    const rest: Record<string, string> = { ...base };
    delete rest[key];
    assert.equal(createAddressSchema.safeParse(rest).success, false, `${key} should be required`);
  }
  // floor/apartmentNo/landmark/deliveryNotes/buildingInfo stay optional.
  assert.equal(
    createAddressSchema.safeParse({
      ...base,
      floor: "3",
      apartmentNo: "12",
      landmark: "Near the mosque",
      deliveryNotes: "Ring twice",
      buildingInfo: "Building 5",
    }).success,
    true,
  );
});

test("Jordanian phone numbers are validated and normalized to one canonical form", () => {
  assert.equal(normalizeJordanianPhone("0790000000"), "0790000000");
  assert.equal(normalizeJordanianPhone("+962790000000"), "0790000000");
  assert.equal(normalizeJordanianPhone("00962790000000"), "0790000000");
  assert.equal(normalizeJordanianPhone("079-000-0000"), "0790000000");
  assert.equal(normalizeJordanianPhone("0781234567"), "0781234567");
  assert.equal(normalizeJordanianPhone("0612345678"), null);
  assert.equal(normalizeJordanianPhone("07900000"), null);
  assert.equal(normalizeJordanianPhone("not-a-phone"), null);

  const parsed = createAddressSchema.safeParse({
    label: "Home",
    recipientName: "A Customer",
    phone: "+962 79 000 0000",
    city: "Amman",
    area: "Shmeisani",
    street: "Main Street",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.phone, "0790000000");

  assert.equal(
    createAddressSchema.safeParse({
      label: "Home",
      recipientName: "A Customer",
      phone: "12345",
      city: "Amman",
      area: "Shmeisani",
      street: "Main Street",
    }).success,
    false,
  );
});

test("support tickets permit general questions without an order", () => {
  assert.equal(createTicketSchema.safeParse({
    subject: "Product question",
    category: "PRODUCT_QUESTION",
    message: "Is this suitable for sensitive skin?",
  }).success, true);
});

test("return quantities cannot be zero or negative", () => {
  const base = { orderId: "o1", orderItemId: "oi1", quantity: 1, reason: "DAMAGED" };
  assert.equal(createReturnSchema.safeParse(base).success, true);
  assert.equal(createReturnSchema.safeParse({ ...base, quantity: 0 }).success, false);
});
