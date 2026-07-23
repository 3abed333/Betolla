import "server-only";
import { prisma } from "@/lib/db";
import { notify } from "./notifications";

export class StoreCreditError extends Error {}

export async function adjustStoreCredit({
  userId,
  amount,
  reason,
  createdById,
}: {
  userId: string;
  amount: number;
  reason: string;
  createdById: string;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { storeCreditBalance: true } });
    if (!user) throw new StoreCreditError("Customer not found");

    const nextBalance = Number(user.storeCreditBalance) + amount;
    if (nextBalance < 0) throw new StoreCreditError("This would take the customer's balance below zero");

    const updated = await tx.user.update({
      where: { id: userId },
      data: { storeCreditBalance: { increment: amount } },
    });
    await tx.storeCreditTransaction.create({
      data: { userId, amount, reason, createdById },
    });
    return updated;
  }).then(async (updated) => {
    await notify({
      userId,
      category: "LOYALTY_AND_WALLET",
      title: amount >= 0 ? "Store credit added" : "Store credit adjusted",
      body: `${amount >= 0 ? "+" : ""}${amount.toFixed(3)} JD: ${reason}`,
    });
    return updated;
  });
}
