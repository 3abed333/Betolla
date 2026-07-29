import bcrypt from "bcryptjs";
import {
  clearE2eRateLimits,
  closeE2eDb,
  resetE2eUserState,
  upsertE2eAddress,
  upsertE2eCatalog,
  upsertE2eUser,
} from "./support/db";
import { E2E_PASSWORD, E2E_PRODUCT, E2E_USERS } from "./support/constants";

export default async function globalSetup() {
  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 10);

  try {
    const adminId = await upsertE2eUser(E2E_USERS.admin, passwordHash, "Admin");
    const staffId = await upsertE2eUser(E2E_USERS.staff, passwordHash, "Staff", adminId);
    const deliveryId = await upsertE2eUser(
      E2E_USERS.delivery,
      passwordHash,
      "Delivery",
      staffId,
    );
    const customerAId = await upsertE2eUser(
      E2E_USERS.customerA,
      passwordHash,
      "Customer A",
    );
    const customerBId = await upsertE2eUser(
      E2E_USERS.customerB,
      passwordHash,
      "Customer B",
    );

    await resetE2eUserState([adminId, staffId, deliveryId, customerAId, customerBId]);
    await upsertE2eAddress(customerAId, "Customer A");
    await upsertE2eAddress(customerBId, "Customer B");
    await upsertE2eCatalog(E2E_PRODUCT);
    await clearE2eRateLimits(Object.values(E2E_USERS).map((user) => user.email));
  } finally {
    await closeE2eDb();
  }
}
