"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { useCartStore } from "@/store/cart-store";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("common");

  function logout() {
    startTransition(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      useCartStore.getState().clear();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={logout} disabled={isPending}>
      {isPending ? t("signingOut") : t("signOut")}
    </Button>
  );
}
