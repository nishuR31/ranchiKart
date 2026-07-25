import { Redis } from "ioredis";
import env from "./env.js";

let redisFatalError = false;

class MockRedis {
  private store = new Map<string, string>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  status = "ready";

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, ...args: any[]): Promise<"OK"> {
    this.store.set(key, value);
    return "OK";
  }

  async setex(key: string, seconds: number, value: string): Promise<"OK"> {
    // Clear any existing timer for this key to prevent leaks on overwrite
    const existing = this.timers.get(key);
    if (existing) clearTimeout(existing);

    this.store.set(key, value);
    const timer = setTimeout(() => {
      this.store.delete(key);
      this.timers.delete(key);
    }, seconds * 1000);
    // Prevent timer from keeping the process alive
    if (timer.unref) timer.unref();
    this.timers.set(key, timer);
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
      const timer = this.timers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(key);
      }
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

  disconnect() {
    // Clear all timers on disconnect
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }
  async quit() {
    this.disconnect();
    return "OK";
  }
}

const mockRedis = new MockRedis();

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
