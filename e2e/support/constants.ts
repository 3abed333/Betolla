export const E2E_PASSWORD = "E2e-Betolla-Password-123!";

export const E2E_USERS = {
  admin: { email: "e2e-admin@betolla.test", username: "e2e_admin", role: "ADMIN" },
  staff: { email: "e2e-staff@betolla.test", username: "e2e_staff", role: "STAFF" },
  delivery: { email: "e2e-delivery@betolla.test", username: "e2e_delivery", role: "DELIVERY" },
  customerA: { email: "e2e-customer-a@betolla.test", username: "e2e_customer_a", role: "CUSTOMER" },
  customerB: { email: "e2e-customer-b@betolla.test", username: "e2e_customer_b", role: "CUSTOMER" },
} as const;

export const E2E_PRODUCT = {
  sku: "E2E-COD-001",
  slug: "e2e-cod-checkout-product",
  name: "E2E COD Checkout Product",
} as const;
