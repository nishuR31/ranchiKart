import type { FastifyInstance } from "fastify";
import { prisma } from "../config/prisma.js";
import env from "../config/env.js";
import currentVersion from "../utils/version.js";
import { sendSuccess } from "../utils/response.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    return sendSuccess(res, "Health OK", 200, { service: env.BUSINESS_NAME || "UrbanRanchi", version: currentVersion });
  });
}
