import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { Button, EmptyState } from "@/components/ui";
import { AddressFormDialog } from "./AddressFormDialog";
import { AddressCard } from "./AddressCard";

export const metadata: Metadata = { title: "Addresses - Betolla Cosmetics" };

export default async function AddressesPage() {
  const session = await requireRole("CUSTOMER");
  const t = await getTranslations("account.addresses");
  const addresses = await prisma.address.findMany({
    where: { userId: session.userId },
    orderBy: [{ isDefaultShipping: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-semibold text-ink">{t("heading")}</h2>
        <AddressFormDialog trigger={<Button size="sm">{t("addAddress")}</Button>} />
      </div>

      {addresses.length === 0 ? (
        <EmptyState
          title={t("noSavedTitle")}
          description={t("noSavedDescription")}
          action={<AddressFormDialog trigger={<Button>{t("addAddress")}</Button>} />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} />
          ))}
        </div>
      )}
    </div>
  );
}
