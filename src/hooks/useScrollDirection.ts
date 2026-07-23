"use client";

import { useEffect, useState } from "react";

const REVEAL_NEAR_TOP_PX = 80;

// true only while scrolling down and past the near-top threshold - never hides while still
// close to the top of the page, and reappears the instant the user scrolls up at all.
export function useScrollDirection(): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;

    function handleScroll() {
      const currentY = window.scrollY;
      if (currentY <= REVEAL_NEAR_TOP_PX) {
        setHidden(false);
      } else if (currentY > lastY) {
        setHidden(true);
      } else if (currentY < lastY) {
        setHidden(false);
      }
      lastY = currentY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return hidden;
}
