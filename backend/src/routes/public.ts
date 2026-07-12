import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

export async function publicRoutes(app: FastifyInstance) {
    app.register(fastifyStatic, {
        root: path.join(__dirname, "../../public"),
        prefix: "/",
    });

}