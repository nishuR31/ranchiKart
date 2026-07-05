import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authMiddleware.js";
import * as wishlistController from "../controllers/wishlistController.js";

export async function wishlistRoutes(app: FastifyInstance) {
  app.get("/wishlist", { preHandler: authenticate }, wishlistController.getItems);
  app.post("/wishlist/toggle", { preHandler: authenticate }, wishlistController.toggle);
  app.post("/wishlist", { preHandler: authenticate }, wishlistController.addItem);
  app.delete("/wishlist/:productId", { preHandler: authenticate }, wishlistController.removeItem);
  app.get("/wishlist/check/:productId", { preHandler: authenticate }, wishlistController.checkItem);
}
