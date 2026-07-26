import type { FastifyInstance } from "fastify";
import currentVersion from "../utils/version.js";
import { sendSuccess } from "../utils/response.js";

export async function version(app: FastifyInstance) {
    app.get("/version", (req, res) => {
        return sendSuccess(res, `Version : ${currentVersion}`, 200, { currentVersion });
    });
}