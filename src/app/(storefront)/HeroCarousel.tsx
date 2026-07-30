"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

type Slide = {
  id: string;
  mediaType: "IMAGE" | "VIDEO" | "YOUTUBE";
  desktopMediaUrl: string;
  mobileMediaUrl: string | null;
  posterUrl: string | null;
  title: string;
  subtitle: string | null;
  ctaLabel: string;
  linkUrl: string;
  focalPointX: number;
  focalPointY: number;
  autoAdvanceSeconds: number;
};

function track(bannerId: string, type: "IMPRESSION" | "CLICK") {
  void fetch("/api/banner-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bannerId, type }),
    keepalive: true,
  });
}

export function HeroCarousel({ slides, label }: { slides: Slide[]; label: string }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStart = useRef<number | null>(null);
  const current = slides[active];
  const go = useCallback((index: number) => setActive((index + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => { track(current.id, "IMPRESSION"); }, [current.id]);
  useEffect(() => {
    if (slides.length < 2 || paused || reducedMotion) return;
    const timer = window.setTimeout(() => go(active + 1), current.autoAdvanceSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [active, current.autoAdvanceSeconds, go, paused, reducedMotion, slides.length]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[#160f02] sm:rounded-3xl md:aspect-[8/3]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") go(active - 1);
        if (event.key === "ArrowRight") go(active + 1);
      }}
      onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const distance = event.changedTouches[0].clientX - touchStart.current;
        if (Math.abs(distance) > 45) go(active + (distance < 0 ? 1 : -1));
        touchStart.current = null;
      }}
    >
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          aria-hidden={index !== active}
          className={cn("absolute inset-0 transition-opacity duration-500", index === active ? "z-10 opacity-100" : "pointer-events-none opacity-0")}
        >
          {slide.mediaType === "YOUTUBE" ? (
            index === active && getYouTubeEmbedUrl(slide.desktopMediaUrl, !reducedMotion) ? (
              <iframe
                key={`${slide.id}-${active}`}
                src={getYouTubeEmbedUrl(slide.desktopMediaUrl, !reducedMotion)!}
                title={slide.title}
                tabIndex={-1}
                aria-hidden
                loading={index === 0 ? "eager" : "lazy"}
                allow="autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                className="pointer-events-none h-full w-full scale-[1.35]"
              />
            ) : null
          ) : slide.mediaType === "VIDEO" ? (
            <video
              key={`${slide.id}-${active === index}`}
              autoPlay={active === index && !reducedMotion}
              muted loop playsInline preload={index === 0 ? "metadata" : "none"}
              poster={slide.posterUrl ?? undefined}
              className="h-full w-full object-cover"
              style={{ objectPosition: `${slide.focalPointX}% ${slide.focalPointY}%` }}
            >
              {slide.mobileMediaUrl && <source src={slide.mobileMediaUrl} media="(max-width: 767px)" />}
              <source src={slide.desktopMediaUrl} />
            </video>
          ) : (
            <>
              <Image
                src={slide.mobileMediaUrl ?? slide.desktopMediaUrl}
                alt=""
                fill
                priority={index === 0}
                sizes="(max-width: 767px) 100vw, 1200px"
                className="scale-110 object-cover opacity-45 blur-xl md:hidden"
                style={{ objectPosition: `${slide.focalPointX}% ${slide.focalPointY}%` }}
              />
              <Image
                src={slide.mobileMediaUrl ?? slide.desktopMediaUrl}
                alt=""
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-contain p-3 md:hidden"
                style={{ objectPosition: `${slide.focalPointX}% ${slide.focalPointY}%` }}
              />
              <Image
                src={slide.desktopMediaUrl}
                alt=""
                fill
                priority={index === 0}
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="hidden scale-110 object-cover opacity-45 blur-2xl md:block"
                style={{ objectPosition: `${slide.focalPointX}% ${slide.focalPointY}%` }}
              />
              <Image
                src={slide.desktopMediaUrl}
                alt=""
                fill
                priority={index === 0}
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="hidden object-contain p-5 md:block"
                style={{ objectPosition: `${slide.focalPointX}% ${slide.focalPointY}%` }}
              />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
            <h1 className="max-w-2xl font-heading text-2xl font-semibold leading-tight sm:text-4xl">{slide.title}</h1>
            {slide.subtitle && <p className="mt-2 max-w-xl text-sm text-white/90 sm:text-base">{slide.subtitle}</p>}
            <Link href={slide.linkUrl} onClick={() => track(slide.id, "CLICK")} tabIndex={index === active ? 0 : -1} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-cta px-5 py-2 text-sm font-medium text-cta-foreground">
              {slide.ctaLabel}
            </Link>
          </div>
        </div>
      ))}
      {slides.length > 1 && (
        <>
          <button type="button" aria-label="Previous slide" onClick={() => go(active - 1)} className="absolute start-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-xl text-white backdrop-blur sm:flex">‹</button>
          <button type="button" aria-label="Next slide" onClick={() => go(active + 1)} className="absolute end-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-xl text-white backdrop-blur sm:flex">›</button>
          <div className="absolute bottom-3 end-4 z-20 flex items-center gap-2" role="tablist">
            {slides.map((slide, index) => <button key={slide.id} type="button" role="tab" aria-selected={index === active} aria-label={`Slide ${index + 1}`} onClick={() => go(index)} className={cn("h-2.5 rounded-full bg-white/70 transition-all", index === active ? "w-7" : "w-2.5")} />)}
            <button type="button" aria-label={paused ? "Resume slides" : "Pause slides"} aria-pressed={paused} onClick={() => setPaused((value) => !value)} className="ms-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-xs text-white">{paused ? "▶" : "Ⅱ"}</button>
          </div>
        </>
      )}
    </section>
  );
}
