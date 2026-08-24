import type { FastifyInstance } from "fastify";
import env from "../config/env.js";
import currentVersion from "../utils/version.js";
import { sendSuccess } from "../utils/response.js";

export async function pingRoutes(app: FastifyInstance) {
  app.get("/ping", async (req, res) => {
    return sendSuccess(res, "pong", 200, { service: env.BUSINESS_NAME || "UrbanRanchi", version: currentVersion });
  });
}
