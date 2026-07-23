import { useToastStore } from "@/store/toast-store";
import type { ToastVariant } from "@/store/toast-store";

function show(variant: ToastVariant, title: string, description?: string) {
  useToastStore.getState().addToast({ variant, title, description });
}

export const toast = {
  success: (title: string, description?: string) => show("success", title, description),
  error: (title: string, description?: string) => show("error", title, description),
  info: (title: string, description?: string) => show("info", title, description),
};
