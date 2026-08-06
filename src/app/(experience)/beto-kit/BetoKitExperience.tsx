"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./beto-kit.module.css";

const VIDEO_SRC = "/media/beto-lens-care-story.mp4";
const SCRUB_FPS = 48;
const SEEK_INTERVAL_MS = 1000 / SCRUB_FPS;

const chapters = [
  {
    eyebrow: "Closed package",
    title: "BETO",
    body: "Everything your lenses need, precisely arranged.",
    start: 0,
    end: 0.135,
  },
  {
    eyebrow: "The reveal",
    title: "One complete lens-care ritual.",
    body: "Designed around every step of your routine.",
    start: 0.135,
    end: 0.285,
  },
  {
    eyebrow: "Multipurpose solution",
    title: "Clean. Rinse. Refresh.",
    body: "A multipurpose solution for everyday lens care.",
    start: 0.285,
    end: 0.435,
  },
  {
    eyebrow: "Lens vials",
    title: "Your color. Your expression.",
    body: "Two carefully presented lens options inside the collection.",
    start: 0.435,
    end: 0.57,
  },
  {
    eyebrow: "Lens cases",
    title: "Protected between every wear.",
    body: "Dedicated storage designed to keep each pair organized.",
    start: 0.57,
    end: 0.705,
  },
  {
    eyebrow: "Precision tools",
    title: "Contact without compromise.",
    body: "Precision tools for cleaner, more controlled handling.",
    start: 0.705,
    end: 0.845,
  },
  {
    eyebrow: "Complete system",
    title: "Everything in its place.",
    body: "The complete BETO lens experience.",
    start: 0.845,
    end: 1,
  },
] as const;

function chapterForProgress(progress: number) {
  const found = chapters.findIndex(
    (chapter, index) =>
      progress >= chapter.start &&
      (progress < chapter.end || index === chapters.length - 1),
  );
  return found === -1 ? chapters.length - 1 : found;
}

export function BetoKitExperience() {
  const storyRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationRef = useRef(0);
  const targetTimeRef = useRef(0);
  const layoutRef = useRef({ top: 0, range: 1 });
  const activeChapterRef = useRef(0);
  const [activeChapter, setActiveChapter] = useState(0);
  const [metadataReady, setMetadataReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(media.matches);
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const prepareVideo = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      durationRef.current = video.duration;
      video.pause();
      video.currentTime = 0.001;
      setMetadataReady(true);
    };

    video.addEventListener("loadedmetadata", prepareVideo);
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) prepareVideo();

    return () => video.removeEventListener("loadedmetadata", prepareVideo);
  }, []);

  useEffect(() => {
    if (reducedMotion || !metadataReady) return;

    const story = storyRef.current;
    const stage = stageRef.current;
    const video = videoRef.current;
    if (!story || !stage || !video || !durationRef.current) return;

    const measure = () => {
      const rect = story.getBoundingClientRect();
      layoutRef.current = {
        top: rect.top + window.scrollY,
        range: Math.max(1, story.offsetHeight - window.innerHeight),
      };
    };

    let seekFrame: number | null = null;
    let lastSeekAt = 0;

    const flushLatestSeek = (now: number) => {
      seekFrame = null;

      // Never pile a second decode request on top of an unfinished one. The
      // `seeked` event below will pick up the newest target immediately.
      if (video.seeking) return;

      const difference = targetTimeRef.current - video.currentTime;
      if (Math.abs(difference) < 0.5 / SCRUB_FPS) return;

      // Seeking a paused video is considerably more expensive than updating
      // ordinary DOM. The source is 48 fps, so requesting more than one seek
      // per source frame adds decoder work without making the film smoother.
      if (now - lastSeekAt < SEEK_INTERVAL_MS) {
        seekFrame = window.requestAnimationFrame(flushLatestSeek);
        return;
      }

      lastSeekAt = now;
      video.currentTime = Math.max(
        0,
        Math.min(durationRef.current - 0.02, targetTimeRef.current),
      );
    };

    const requestLatestSeek = () => {
      if (seekFrame === null) {
        seekFrame = window.requestAnimationFrame(flushLatestSeek);
      }
    };

    const onSeeked = () => requestLatestSeek();

    const updateTarget = () => {
      const { top, range } = layoutRef.current;
      const progress = Math.max(
        0,
        Math.min(1, (window.scrollY - top) / range),
      );
      const rawTarget = progress * Math.max(0, durationRef.current - 0.02);
      const nextTarget = Math.round(rawTarget * SCRUB_FPS) / SCRUB_FPS;

      stage.style.setProperty("--story-progress", String(progress));
      const nextChapter = chapterForProgress(progress);
      if (nextChapter !== activeChapterRef.current) {
        activeChapterRef.current = nextChapter;
        setActiveChapter(nextChapter);
      }

      if (Math.abs(nextTarget - targetTimeRef.current) >= 1 / SCRUB_FPS) {
        targetTimeRef.current = nextTarget;
        requestLatestSeek();
      }
    };

    let scrollFrame: number | null = null;
    const onScroll = () => {
      if (scrollFrame !== null) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = null;
        updateTarget();
      });
    };
    const onResize = () => {
      measure();
      updateTarget();
    };

    measure();
    updateTarget();
    video.addEventListener("seeked", onSeeked);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      video.removeEventListener("seeked", onSeeked);
      if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
      if (seekFrame !== null) window.cancelAnimationFrame(seekFrame);
    };
  }, [metadataReady, reducedMotion]);

  function preventPlayback() {
    if (!reducedMotion) videoRef.current?.pause();
  }

  return (
    // The story's copy is hardcoded English (chapters above) and its layout (.chapter /
    // .chapter:nth-child(even) in beto-kit.module.css) mixes logical flexbox alignment with
    // physical text-align - the two disagree and clip text off-screen once the site's dir flips
    // to rtl. Pinning this whole experience to ltr keeps it correct regardless of site locale.
    <div dir="ltr" lang="en">
      <section
        ref={storyRef}
        className={styles.story}
        data-reduced-motion={reducedMotion ? "true" : "false"}
        aria-label="BETO lens-care product story"
      >
        <div
          ref={stageRef}
          className={styles.stage}
          data-chapter={activeChapter + 1}
        >
          <div className={styles.videoColumn}>
            <div className={styles.videoFrame}>
              <video
                ref={videoRef}
                className={styles.video}
                src={VIDEO_SRC}
                muted
                playsInline
                preload={reducedMotion ? "metadata" : "auto"}
                controls={reducedMotion}
                disablePictureInPicture={!reducedMotion}
                controlsList={
                  reducedMotion
                    ? "nodownload"
                    : "nodownload noplaybackrate nofullscreen"
                }
                onPlay={preventPlayback}
                aria-label="BETO complete lens-care kit presentation"
              >
                Your browser does not support embedded video.
              </video>
              {!metadataReady && (
                <div className={styles.loading} role="status" aria-live="polite">
                  <span className={styles.loadingMark} aria-hidden />
                  <span>Preparing the BETO experience</span>
                </div>
              )}
            </div>
            <p className={styles.scrollHint} aria-hidden>
              <span /> Scroll to reveal
            </p>
          </div>

          <div className={styles.copyColumn} aria-live="polite">
            <div className={styles.chapterNumber}>
              <span>{String(activeChapter + 1).padStart(2, "0")}</span>
              <span aria-hidden>/</span>
              <span>{String(chapters.length).padStart(2, "0")}</span>
            </div>
            <div className={styles.chapterStack}>
              {chapters.map((chapter, index) => (
                <article
                  key={chapter.eyebrow}
                  className={styles.chapter}
                  data-active={index === activeChapter ? "true" : "false"}
                  aria-hidden={index !== activeChapter}
                >
                  <p className={styles.eyebrow}>{chapter.eyebrow}</p>
                  <h1>{chapter.title}</h1>
                  <p className={styles.chapterBody}>{chapter.body}</p>
                </article>
              ))}
            </div>
            <div className={styles.progress} aria-hidden>
              <span className={styles.progressFill} />
            </div>
          </div>
        </div>
      </section>

      {reducedMotion && (
        <section className={styles.reducedChapters} aria-label="BETO story chapters">
          {chapters.map((chapter, index) => (
            <article key={chapter.eyebrow}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p>{chapter.eyebrow}</p>
                <h2>{chapter.title}</h2>
                <p>{chapter.body}</p>
              </div>
            </article>
          ))}
        </section>
      )}

      <noscript>
        <div className={styles.noScript}>
          <p>BETO</p>
          <h1>Everything your lenses need, precisely arranged.</h1>
          <p>
            Enable JavaScript for the scroll-controlled film, or continue to the
            complete collection.
          </p>
        </div>
      </noscript>

      <section className={styles.finalCta}>
        <p>THE COMPLETE BETO COLLECTION</p>
        <h2>
          Everything in its place.
          <br />
          Every detail considered.
        </h2>
        <Link href="/products?category=beto-lenses">
          Discover the complete collection
        </Link>
      </section>
    </div>
  );
}
