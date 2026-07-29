const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

export function getYouTubeVideoId(value: string): string | null {
  const input = value.trim();
  if (!input) return null;

  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null;

    let candidate: string | null = null;
    if (url.hostname.toLowerCase().endsWith("youtu.be")) {
      candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (url.pathname === "/watch") {
      candidate = url.searchParams.get("v");
    } else {
      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0])) candidate = parts[1] ?? null;
    }

    return candidate && YOUTUBE_VIDEO_ID.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function normalizeYouTubeUrl(value: string): string | null {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

export function getYouTubeEmbedUrl(value: string, autoplay = true): string | null {
  const videoId = getYouTubeVideoId(value);
  if (!videoId) return null;

  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    mute: "1",
    controls: "0",
    loop: "1",
    playlist: videoId,
    playsinline: "1",
    rel: "0",
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
