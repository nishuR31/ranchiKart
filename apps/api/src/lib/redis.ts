import { Redis } from "ioredis";
import { env } from "../env.js";

export const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null
    })
  : null;

redis?.on("error", () => {
  // The rate-limit plugin falls back to in-memory storage when Redis is absent.
});

export async function connectRedis() {
  if (!redis) return null;

  try {
    await redis.connect();
    return redis;
  } catch (error) {
    console.warn("Redis unavailable; rate limiting will use in-memory storage.", error);
    redis.disconnect();
    return null;
  }
}
