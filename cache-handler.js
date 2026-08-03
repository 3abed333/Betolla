// Custom Next.js cache handler backed by Redis, so the Data Cache (unstable_cache /
// fetch cache) is shared across all PM2 process instances instead of each process
// keeping its own private in-memory copy. Next.js's built-in file-system handler only
// persists to disk when ctx.flushToDisk is set, which is not the case for a plain
// `next start` deployment, so without this the cache is per-process only.
//
// Loaded directly by Next.js via next.config.ts's `cacheHandler` option - runs outside
// the app's TypeScript build, so this stays plain CommonJS.

const Redis = require("ioredis");

const redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
  lazyConnect: false,
  maxRetriesPerRequest: 1,
  connectTimeout: 3000,
  retryStrategy: (times) => Math.min(times * 500, 5000),
});

redis.on("error", (err) => {
  console.error("[cache-handler] Redis connection error:", err.message);
});

const KEY_PREFIX = "nextcache:";

function serialize(entry) {
  return JSON.stringify(entry, (_key, value) => {
    if (value && value.type === "Buffer" && Array.isArray(value.data)) {
      return { __bufferMarker: true, base64: Buffer.from(value.data).toString("base64") };
    }
    if (Buffer.isBuffer(value)) {
      return { __bufferMarker: true, base64: value.toString("base64") };
    }
    return value;
  });
}

function deserialize(raw) {
  return JSON.parse(raw, (_key, value) => {
    if (value && value.__bufferMarker) return Buffer.from(value.base64, "base64");
    return value;
  });
}

module.exports = class RedisCacheHandler {
  constructor(ctx) {
    this.revalidatedTags = ctx.revalidatedTags || [];
  }

  async get(key) {
    try {
      const raw = await redis.get(KEY_PREFIX + key);
      if (!raw) return null;
      return deserialize(raw);
    } catch (err) {
      console.error("[cache-handler] get failed:", err.message);
      return null;
    }
  }

  async set(key, data, ctx) {
    try {
      if (!data) {
        await redis.del(KEY_PREFIX + key);
        return;
      }
      const entry = { lastModified: Date.now(), value: data };
      const payload = serialize(entry);
      const revalidate = (ctx && ctx.revalidate) || data.revalidate;
      if (typeof revalidate === "number" && revalidate > 0 && Number.isFinite(revalidate)) {
        // Small buffer past the app's own revalidate window so Next.js's own
        // staleness check (based on lastModified) is what triggers refresh in the
        // normal case, and Redis TTL is just a backstop cleanup.
        await redis.set(KEY_PREFIX + key, payload, "EX", Math.ceil(revalidate) + 60);
      } else {
        await redis.set(KEY_PREFIX + key, payload);
      }
    } catch (err) {
      console.error("[cache-handler] set failed:", err.message);
    }
  }

  async revalidateTag() {
    // No tag-based revalidation is currently used by this app's unstable_cache calls
    // (they're time-based only via the `revalidate` option) - nothing to do here.
  }

  resetRequestCache() {}
};
