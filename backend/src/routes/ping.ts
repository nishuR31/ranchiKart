import type { FastifyInstance } from "fastify";
import env from "../config/env.js";

export async function pingRoutes(app: FastifyInstance) {
    app.get("/ping", async () => {
        return { ok: true, ping: "pong", service: env.BUSINESS_NAME || "MudraKart" };
    });
}
