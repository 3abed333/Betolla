"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setThemePreference } from "@/lib/theme/actions";
import type { ThemeChoice } from "@/lib/theme/config";

export function ThemeToggle() {
  const t = useTranslations("theme");
  const [isDark, setIsDark] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Syncs from the "dark" class the pre-hydration inline script (see lib/theme/inline-script)
    // already applied to <html> - reading an external system's current state on mount, not
    // deriving state from a prop/state change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next: ThemeChoice = isDark ? "light" : "dark";
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark", next === "dark");
    startTransition(() => {
      setThemePreference(next);
    });
  }

  // Icon/label always represent the theme a click would switch TO, not the current one (the
  // conventional pattern) - sun (+ "Light") while in dark mode, moon (+ "Dark") while in light mode.
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-label={isDark ? t("switchToLight") : t("switchToDark")}
      className="flex h-10 items-center gap-1.5 rounded-full border border-border px-3 text-ink-faint transition-colors hover:text-ink"
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 shrink-0">
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0">
          <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 1020.354 15.354z" />
        </svg>
      )}
      <span className="text-xs font-medium">{isDark ? t("light") : t("dark")}</span>
    </button>
  );
}
