import fp from "fastify-plugin";
import fastifyRateLimit from "@fastify/rate-limit";
import { env } from "../env.js";
import { connectRedis } from "../lib/redis.js";

export const rateLimitPlugin = fp(async (app) => {
  const redis = await connectRedis();

  await app.register(fastifyRateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    redis: redis ?? undefined,
    keyGenerator: (request) => request.ip
  });
});
