import { Redis } from "ioredis";
import env from "./env.js";

let redisFatalError = false;

const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 5,
    enableReadyCheck: true,
    enableOfflineQueue: true,
    retryStrategy: (times) => {
      if (times > 3) {
        redisFatalError = true;
        console.warn("[Redis] Max retries reached — Redis disabled, falling back to in-memory cache.");
        return null; // stop retrying
      }
      const delay = Math.min(times * 200, 2000); // max 2 seconds
      return delay;
    },
  })
  : null;

redis?.on("error", (error: any) => {
  const msg: string = error?.message ?? String(error);
  // NOAUTH / WRONGPASS = wrong/missing password — no point retrying
  if (msg.includes("NOAUTH") || msg.includes("WRONGPASS") || msg.includes("ERR invalid password")) {
    if (!redisFatalError) {
      redisFatalError = true;
      console.warn("[Redis] Auth failed — Redis disabled, falling back to in-memory cache.");
      redis!.disconnect();
    }
  }
});

redis?.on("connect", () => {
  if (!redisFatalError) console.log("[Redis] connected");
});

export async function connectRedis() {
  if (!redis) return null;
  try {
    await redis.connect();
    return redis;
  } catch (error) {
    console.warn("[Redis] unavailable, falling back to in-memory cache:", (error as any)?.message);
    return null;
  }
}

export default redis;
