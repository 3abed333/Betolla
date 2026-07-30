import Image from "next/image";
import { cn } from "@/lib/cn";

export function BrandLogo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <span className={cn("relative block h-11 w-36 shrink-0", className)}>
      <Image
        src="/brand/betolla-logo-clean.png"
        alt="Betolla Cosmetics"
        fill
        priority={priority}
        sizes="180px"
        className="brand-logo object-contain"
      />
    </span>
  );
}
