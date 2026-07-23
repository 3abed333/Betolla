"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

function Star({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={cn("h-5 w-5", filled ? "fill-accent text-accent" : "fill-none text-border", className)}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
    >
      <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L10 14.9l-5.2 2.73.99-5.8-4.21-4.1 5.82-.85z" />
    </svg>
  );
}

/** Read-only display, e.g. product cards / review lists. */
export function StarRatingDisplay({ rating, count, className }: { rating: number; count?: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} filled={i < Math.round(rating)} />
        ))}
      </div>
      <span className="text-sm text-ink-muted">
        {rating.toFixed(1)}
        {typeof count === "number" && ` (${count})`}
      </span>
    </div>
  );
}

/** Interactive input, e.g. leaving a review. */
export function StarRatingInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  const t = useTranslations("storefront.productDetail");
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value;

  return (
    <div className={cn("flex gap-1", className)} onMouseLeave={() => setHovered(null)}>
      {Array.from({ length: 5 }, (_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={i}
            type="button"
            aria-label={t("rateOutOf5", { value: starValue })}
            onMouseEnter={() => setHovered(starValue)}
            onClick={() => onChange(starValue)}
            className="p-0.5"
          >
            <Star filled={starValue <= display} className="h-6 w-6" />
          </button>
        );
      })}
    </div>
  );
}
