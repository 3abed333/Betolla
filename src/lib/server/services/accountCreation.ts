import "server-only";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { generateTempPassword } from "@/lib/auth/temp-password";
import { logActivity } from "./activityLog";
import { ROLE_NOTIFICATION_CATEGORIES, buildDefaultPreferences } from "./notifications";
import type { Role } from "@/generated/prisma/client";

export class AccountCreationError extends Error {}

/**
 * Shared by Admin creating Staff and Staff creating Delivery accounts - same shape, only the
 * role and actor differ. Always sets a temp password + forces a change on first login, since
 * no real email provider is wired up to send an invite link (see plan notes).
 */
export async function createManagedAccount(params: {
  role: Extract<Role, "STAFF" | "DELIVERY">;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone?: string;
  createdById: string;
  createdByRole: Role;
}) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: params.email }, { username: params.username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    const field = existing.email === params.email ? "email" : "username";
    throw new AccountCreationError(`That ${field} is already in use`);
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.user.create({
    data: {
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      username: params.username,
      phone: params.phone,
      role: params.role,
      passwordHash,
      mustChangePassword: true,
      createdById: params.createdById,
    },
  });

  await logActivity({
    actorId: params.createdById,
    actorRole: params.createdByRole,
    action: params.role === "STAFF" ? "STAFF_CREATE" : "DELIVERY_ACCOUNT_CREATE",
    entityType: "User",
    entityId: user.id,
    afterData: { email: user.email, username: user.username, role: user.role },
  });

  const categories = ROLE_NOTIFICATION_CATEGORIES[params.role] ?? [];
  if (categories.length > 0) {
    await prisma.notificationPreference.createMany({
      data: buildDefaultPreferences(categories).map((p) => ({ ...p, userId: user.id })),
    });
  }

  return { user, tempPassword };
}
