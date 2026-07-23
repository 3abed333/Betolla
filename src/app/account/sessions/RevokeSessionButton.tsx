"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

export function RevokeSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("account.sessions");

  function revoke() {
    startTransition(async () => {
      await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={revoke} disabled={isPending}>
      {isPending ? t("signingOut") : t("signOut")}
    </Button>
  );
}
