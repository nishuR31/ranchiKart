import redis from "./redis.js";

// ─── In-memory fallback cache (used when Redis is unavailable) ────────────────
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}
const memCache = new Map<string, CacheEntry<unknown>>();

function memGet<T>(key: string): T | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memCache.delete(key);
    return null;
  }
  return entry.value as T;
}
function memSet<T>(key: string, value: T, ttlSeconds: number) {
  memCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  // Auto-evict after 500 keys to prevent unbounded growth
  if (memCache.size > 500) {
    const first = memCache.keys().next().value;
    if (first) memCache.delete(first);
  }
}

/**
 * Get a cached value, or compute + cache it.
 * Uses Redis when available, falls back to in-process LRU-ish memory cache.
 */
export async function getOrSet<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const redisReady = redis && redis.status === "ready";

  if (redisReady) {
    const cached = await redis!.get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        /* recompute */
      }
    }
    const value = await fn();
    await redis!.set(key, JSON.stringify(value), "EX", ttlSeconds);
    return value;
  }

  // Memory fallback
  const hit = memGet<T>(key);
  if (hit !== null) return hit;
  const value = await fn();
  memSet(key, value, ttlSeconds);
  return value;
}

export async function invalidate(pattern: string) {
  // Invalidate memory cache (simple prefix match for wildcard patterns ending in *)
  const prefix = pattern.endsWith("*") ? pattern.slice(0, -1) : null;
  for (const key of memCache.keys()) {
    if (prefix ? key.startsWith(prefix) : key === pattern) memCache.delete(key);
  }

  if (!redis || redis.status !== "ready") return;
  const keys = await redis!.keys(pattern);
  if (keys.length > 0) await redis!.del(...keys);
}
