import type { FastifyInstance } from "fastify";
import { prisma } from "../config/prisma.js";
import env from "../config/env.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, service: env.BUSINESS_NAME || "RanchiKart" };
  });
}
