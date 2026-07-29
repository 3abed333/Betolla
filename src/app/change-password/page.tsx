import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata: Metadata = { title: "Change password - Betolla Cosmetics" };

export default async function ChangePasswordPage() {
  const session = await getCurrentSession({ allowPasswordChangeRequired: true });
  if (!session) redirect("/login");

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
