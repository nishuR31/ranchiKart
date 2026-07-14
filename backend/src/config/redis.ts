import { Redis } from "ioredis";
import env from "./env.js";

let redisFatalError = false;

class MockRedis {
  private store = new Map<string, string>();
  status = "ready";

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, ...args: any[]): Promise<"OK"> {
    this.store.set(key, value);
    return "OK";
  }

  async setex(key: string, seconds: number, value: string): Promise<"OK"> {
    this.store.set(key, value);
    // Simple mock expiry (not strictly needed for local demo, but matches interface)
    setTimeout(() => {
      this.store.delete(key);
    }, seconds * 1000);
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  async keys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    const prefix = pattern.endsWith("*") ? pattern.slice(0, -1) : null;
    for (const key of this.store.keys()) {
      if (prefix ? key.startsWith(prefix) : key === pattern) {
        keys.push(key);
      }
    }
    return keys;
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (event === "connect" || event === "ready") {
      setTimeout(() => callback(), 0);
    }
    return this;
  }

  async connect() {
    return this;
  }

  disconnect() {}
  async quit() {
    return "OK";
  }
}

const mockRedis = new MockRedis();
mockRedis.set("api_key", "fake-demo-api-key");
mockRedis.set("demo_api_key", "fake-demo-api-key");
mockRedis.set("GEMINI_API_KEY", "dummy-api-key");

const realRedis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 5,
    enableReadyCheck: true,
    enableOfflineQueue: true,
    retryStrategy: (times) => {
      if (times > 3) {
        redisFatalError = true;
        console.warn("[Redis] Max retries reached — Redis disabled, falling back to in-memory MockRedis.");
        return null; // stop retrying
      }
      const delay = Math.min(times * 200, 2000); // max 2 seconds
      return delay;
    },
  })
  : null;

if (realRedis) {
  realRedis.on("error", (error: any) => {
    const msg: string = error?.message ?? String(error);
    if (msg.includes("NOAUTH") || msg.includes("WRONGPASS") || msg.includes("ERR invalid password")) {
      if (!redisFatalError) {
        redisFatalError = true;
        console.warn("[Redis] Auth failed — Redis disabled, falling back to in-memory MockRedis.");
        realRedis.disconnect();
      }
    }
  });

  realRedis.on("connect", () => {
    if (!redisFatalError) console.log("[Redis] connected");
  });
}

const redis = new Proxy({} as any, {
  get(target, prop) {
    const useMock = redisFatalError || !realRedis;
    const activeClient = useMock ? mockRedis : realRedis;

    if (prop === "status") {
      return (activeClient as any).status;
    }

    const value = (activeClient as any)[prop];
    if (typeof value === "function") {
      return (...args: any[]) => {
        try {
          return value.apply(activeClient, args);
        } catch (err) {
          if (!useMock) {
            redisFatalError = true;
            console.warn("[Redis] Error during execution, falling back to MockRedis:", err);
            return (mockRedis as any)[prop](...args);
          }
          throw err;
        }
      };
    }
    return value;
  }
});

export async function connectRedis() {
  if (!realRedis) return redis;
  try {
    await realRedis.connect();
    return redis;
  } catch (error) {
    redisFatalError = true;
    console.warn("[Redis] unavailable, falling back to in-memory MockRedis:", (error as any)?.message);
    return redis;
  }
}

export default redis;
