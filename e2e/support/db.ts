import "dotenv/config";
import pg from "pg";

const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("TEST_DATABASE_URL or DATABASE_URL is required.");

const parsedUrl = new URL(connectionString);
const databaseName = parsedUrl.pathname.replace(/^\//, "");
const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);
const isClearlyTestDatabase = /(^|[_-])test($|[_-])/i.test(databaseName);

if (!isLoopback && !isClearlyTestDatabase) {
  throw new Error(
    `Refusing to run E2E database fixtures against remote non-test database "${databaseName}".`,
  );
}

const pool = new pg.Pool({ connectionString });

type UserSeed = {
  email: string;
  username: string;
  role: "ADMIN" | "STAFF" | "DELIVERY" | "CUSTOMER";
};

export async function upsertE2eUser(
  user: UserSeed,
  passwordHash: string,
  lastName: string,
  createdById: string | null = null,
) {
  const result = await pool.query<{ id: string }>(
    `
      INSERT INTO "User" (
        "id", "email", "username", "passwordHash", "role", "firstName", "lastName",
        "locale", "isActive", "mustChangePassword", "createdById", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4::"Role", 'E2E', $5,
        'EN'::"Locale", true, false, $6, NOW(), NOW()
      )
      ON CONFLICT ("email") DO UPDATE SET
        "passwordHash" = EXCLUDED."passwordHash",
        "role" = EXCLUDED."role",
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        "locale" = 'EN'::"Locale",
        "isActive" = true,
        "mustChangePassword" = false,
        "createdById" = EXCLUDED."createdById",
        "updatedAt" = NOW()
      RETURNING "id"
    `,
    [user.email, user.username, passwordHash, user.role, lastName, createdById],
  );
  return result.rows[0].id;
}

export async function resetE2eUserState(userIds: string[]) {
  await pool.query(
    `UPDATE "Session" SET "revokedAt" = NOW() WHERE "userId" = ANY($1::text[]) AND "revokedAt" IS NULL`,
    [userIds],
  );
  await pool.query(`DELETE FROM "Cart" WHERE "userId" = ANY($1::text[])`, [userIds]);
}

export async function upsertE2eAddress(userId: string, lastName: string) {
  const existing = await pool.query<{ id: string }>(
    `SELECT "id" FROM "Address" WHERE "userId" = $1 ORDER BY "createdAt" LIMIT 1`,
    [userId],
  );
  if (existing.rows[0]) {
    await pool.query(
      `
        UPDATE "Address" SET
          "label" = 'E2E Home',
          "recipientName" = $2,
          "phone" = '0790000000',
          "city" = 'Amman',
          "area" = 'Shmeisani',
          "street" = 'E2E Test Street 1',
          "isDefaultShipping" = true,
          "updatedAt" = NOW()
        WHERE "id" = $1
      `,
      [existing.rows[0].id, `E2E ${lastName}`],
    );
    return existing.rows[0].id;
  }

  const created = await pool.query<{ id: string }>(
    `
      INSERT INTO "Address" (
        "id", "userId", "label", "recipientName", "phone", "city", "area", "street",
        "isDefaultShipping", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid()::text, $1, 'E2E Home', $2, '0790000000', 'Amman', 'Shmeisani',
        'E2E Test Street 1', true, NOW(), NOW()
      )
      RETURNING "id"
    `,
    [userId, `E2E ${lastName}`],
  );
  return created.rows[0].id;
}

export async function upsertE2eCatalog(product: {
  sku: string;
  slug: string;
  name: string;
}) {
  await pool.query(
    `
      INSERT INTO "ShippingZone" ("id", "cityEn", "cityAr", "fee", "isActive")
      VALUES (gen_random_uuid()::text, 'Amman', 'عمّان', 0, true)
      ON CONFLICT ("cityEn") DO UPDATE SET "cityAr" = EXCLUDED."cityAr", "fee" = 0, "isActive" = true
    `,
  );
  const category = await pool.query<{ id: string }>(
    `
      INSERT INTO "Category" (
        "id", "nameEn", "nameAr", "slug", "isActive", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid()::text, 'E2E Testing', 'اختبار آلي', 'e2e-testing', true, NOW(), NOW()
      )
      ON CONFLICT ("slug") DO UPDATE SET "isActive" = true, "updatedAt" = NOW()
      RETURNING "id"
    `,
  );
  await pool.query(
    `
      INSERT INTO "Product" (
        "id", "sku", "slug", "nameEn", "nameAr", "descriptionEn", "descriptionAr",
        "price", "stock", "lowStockThreshold", "categoryId", "mainImageUrl", "isActive",
        "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid()::text, $1, $2, $3, 'منتج اختبار الدفع عند الاستلام',
        'A deterministic product used only by automated checkout tests.',
        'منتج مخصص للاختبارات الآلية فقط.', 10, 500, 5, $4,
        '/seed-images/hair-care/serum-01.jpg', true, NOW(), NOW()
      )
      ON CONFLICT ("sku") DO UPDATE SET
        "slug" = EXCLUDED."slug",
        "nameEn" = EXCLUDED."nameEn",
        "stock" = 500,
        "price" = 10,
        "isActive" = true,
        "categoryId" = EXCLUDED."categoryId",
        "updatedAt" = NOW()
    `,
    [product.sku, product.slug, product.name, category.rows[0].id],
  );
}

export async function clearE2eRateLimits(emails: string[]) {
  await pool.query(`DELETE FROM "RateLimitBucket" WHERE "key" LIKE ANY($1::text[])`, [
    emails.map((email) => `%${email}%`),
  ]);
  // Playwright projects share one loopback address. Clear only login network buckets in the
  // guarded local/test database so repeated desktop/mobile runs cannot rate-limit one another.
  await pool.query(`DELETE FROM "RateLimitBucket" WHERE "key" LIKE 'login-ip:%'`);
}

export async function clearE2eUploadQuotaForEmail(email: string) {
  await pool.query(
    `DELETE FROM "UploadQuota" WHERE "userId" = (SELECT "id" FROM "User" WHERE "email" = $1)`,
    [email],
  );
}

export async function getE2eFixtureIds() {
  const result = await pool.query<{
    productId: string;
    customerAId: string;
    customerBId: string;
    customerAAddressId: string;
  }>(
    `
      SELECT
        (SELECT "id" FROM "Product" WHERE "sku" = 'E2E-COD-001') AS "productId",
        (SELECT "id" FROM "User" WHERE "email" = 'e2e-customer-a@betolla.test') AS "customerAId",
        (SELECT "id" FROM "User" WHERE "email" = 'e2e-customer-b@betolla.test') AS "customerBId",
        (
          SELECT a."id"
          FROM "Address" a
          JOIN "User" u ON u."id" = a."userId"
          WHERE u."email" = 'e2e-customer-a@betolla.test'
          ORDER BY a."createdAt"
          LIMIT 1
        ) AS "customerAAddressId"
    `,
  );
  const fixture = result.rows[0];
  if (
    !fixture?.productId ||
    !fixture.customerAId ||
    !fixture.customerBId ||
    !fixture.customerAAddressId
  ) {
    throw new Error("E2E fixtures are missing. Run Playwright global setup first.");
  }
  return fixture;
}

export async function getFirstOrderItemId(orderId: string) {
  const result = await pool.query<{ id: string }>(
    `SELECT "id" FROM "OrderItem" WHERE "orderId" = $1 LIMIT 1`,
    [orderId],
  );
  if (!result.rows[0]) throw new Error(`Order ${orderId} has no items.`);
  return result.rows[0].id;
}

export async function getOrderPaymentMethodLabel(orderId: string) {
  const result = await pool.query<{ paymentMethodLabel: string }>(
    `SELECT "paymentMethodLabel" FROM "Order" WHERE "id" = $1`,
    [orderId],
  );
  if (!result.rows[0]) throw new Error(`Order ${orderId} was not found.`);
  return result.rows[0].paymentMethodLabel;
}

export async function getOrderGiftDetails(orderId: string) {
  const result = await pool.query<{
    isGift: boolean;
    giftOccasion: string | null;
    giftRecipientName: string | null;
    giftMessage: string | null;
  }>(
    `SELECT "isGift", "giftOccasion", "giftRecipientName", "giftMessage"
     FROM "Order"
     WHERE "id" = $1`,
    [orderId],
  );
  if (!result.rows[0]) throw new Error(`Order ${orderId} was not found.`);
  return result.rows[0];
}

export async function getOrderStatus(orderId: string) {
  const result = await pool.query<{ status: string }>(`SELECT "status" FROM "Order" WHERE "id" = $1`, [orderId]);
  if (!result.rows[0]) throw new Error(`Order ${orderId} was not found.`);
  return result.rows[0].status;
}

// Test-only shortcut to fast-forward an order past PENDING without going through the
// admin/staff status API - used to prove customers can no longer cancel once it's moved on.
export async function forceOrderStatus(orderId: string, status: string) {
  await pool.query(`UPDATE "Order" SET "status" = $2 WHERE "id" = $1`, [orderId, status]);
}

export async function getProductStock(productId: string) {
  const result = await pool.query<{ stock: number }>(`SELECT "stock" FROM "Product" WHERE "id" = $1`, [productId]);
  if (!result.rows[0]) throw new Error(`Product ${productId} was not found.`);
  return result.rows[0].stock;
}

export async function closeE2eDb() {
  await pool.end();
}
