import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authMiddleware.js";
import * as catalogController from "../controllers/catalogController.js";

export async function catalogRoutes(app: FastifyInstance) {
  app.get("/categories", catalogController.getCategories);
  app.get("/products/featured", catalogController.getFeaturedProducts);
  app.get("/products", catalogController.getProducts);
  app.get("/search", catalogController.searchProducts);
  app.get("/products/:slug", catalogController.getProduct);
  app.delete("/catalog/cache", { preHandler: authenticate }, catalogController.invalidateCache);
}
