"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setThemePreference } from "@/lib/theme/actions";
import type { ThemeChoice } from "@/lib/theme/config";

export function ThemeToggle({ allowPlainDark = true }: { allowPlainDark?: boolean }) {
  const t = useTranslations("theme");
  const [theme, setTheme] = useState<ThemeChoice>("light");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Syncs from the "dark" class the pre-hydration inline script (see lib/theme/inline-script)
    // already applied to <html> - reading an external system's current state on mount, not
    // deriving state from a prop/state change.
    const currentTheme = document.documentElement.classList.contains("dark")
      ? "dark"
      : document.documentElement.classList.contains("gold")
        ? "gold"
        : "light";

    if (!allowPlainDark && currentTheme === "dark") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("gold");
      // This mirrors the theme already applied to <html> before hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme("gold");
      startTransition(() => {
        setThemePreference("gold");
      });
      return;
    }

    setTheme(currentTheme);
  }, [allowPlainDark]);

  function changeTheme(next: ThemeChoice) {
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.classList.toggle("gold", next === "gold");
    startTransition(() => {
      setThemePreference(next);
    });
  }

  if (!allowPlainDark) {
    const nextTheme: ThemeChoice = theme === "gold" ? "light" : "gold";

    return (
      <button
        type="button"
        onClick={() => changeTheme(nextTheme)}
        disabled={isPending}
        aria-label={theme === "gold" ? t("switchToLight") : t("switchToGold")}
        className="flex h-10 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-ink-muted transition-colors hover:border-cta hover:text-ink disabled:pointer-events-none disabled:opacity-50"
      >
        {theme === "gold" ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0" aria-hidden>
            <circle cx="12" cy="12" r="4" />
            <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.7 5.3H19l-4.3 3.2 1.6 5.2-4.3-3.1-4.3 3.1 1.6-5.2L5 8.3h5.3L12 3z" />
          </svg>
        )}
        <span>{theme === "gold" ? t("gold") : t("light")}</span>
      </button>
    );
  }

  return (
    <label className="relative flex h-10 items-center rounded-full border border-border px-3 text-ink-muted transition-colors hover:text-ink">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="me-1.5 h-4 w-4 shrink-0" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.7 5.3H19l-4.3 3.2 1.6 5.2-4.3-3.1-4.3 3.1 1.6-5.2L5 8.3h5.3L12 3z" />
      </svg>
      <span className="sr-only">{t("choose")}</span>
      <select
        value={theme}
        onChange={(event) => changeTheme(event.target.value as ThemeChoice)}
      disabled={isPending}
        aria-label={t("choose")}
        className="appearance-none bg-transparent pe-4 text-xs font-medium outline-none"
    >
        <option value="light">{t("light")}</option>
        <option value="gold">{t("gold")}</option>
        {allowPlainDark && <option value="dark">{t("dark")}</option>}
      </select>
      <svg viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute end-2 h-3 w-3" aria-hidden>
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      </svg>
    </label>
  );
}
