import { Redis } from "ioredis";
import env from "./env.js";
const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 5,
      enableOfflineQueue: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 200, 2000); // max 2 seconds
        return delay;
      },
    })
  : null;

redis?.on("error", (error) => {
  console.error("RAM error:", error);
});
redis?.on("connect", () => {
  console.log("RAM connected");
});
redis?.on("reconnecting", () => {
  console.log("RAM reconnecting");
});
redis?.on("end", () => {
  console.log("RAM disconnected");
});
redis?.on("close", () => {
  console.log("RAM closed");
});

export async function connectRedis() {
  if (!redis) return null;

  try {
    await redis.connect();
    return redis;
  } catch (error) {
    console.warn("Redis unavailable, fallback to in memory caching...", error);
    return null;
  }
}

export default redis;
