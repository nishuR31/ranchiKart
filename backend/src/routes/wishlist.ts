import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authMiddleware.js";
import * as wishlistController from "../controllers/wishlistController.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";

const wishlistProductParamSchema = zodToJsonSchema(
  z.object({ productId: z.string() }),
  { $refStrategy: "none" }
);

const wishlistProductBodySchema = zodToJsonSchema(
  z.object({ productId: z.string() }),
  { $refStrategy: "none" }
);

export async function wishlistRoutes(app: FastifyInstance) {
  app.get("/wishlist", { preHandler: authenticate }, wishlistController.getItems);
  app.post("/wishlist/toggle", { preHandler: authenticate, schema: { body: wishlistProductBodySchema } }, wishlistController.toggle);
  app.post("/wishlist", { preHandler: authenticate, schema: { body: wishlistProductBodySchema } }, wishlistController.addItem);
  app.delete("/wishlist/:productId", { preHandler: authenticate, schema: { params: wishlistProductParamSchema } }, wishlistController.removeItem);
  app.get("/wishlist/check/:productId", { preHandler: authenticate, schema: { params: wishlistProductParamSchema } }, wishlistController.checkItem);
}
