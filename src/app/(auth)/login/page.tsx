import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in - Betolla Cosmetics" };

export default function LoginPage() {
  return <LoginForm />;
}
