import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authMiddleware.js";
import * as catalogController from "../controllers/catalogController.js";
import { productQuerySchema, getProductsSchema, searchProductsQuerySchema } from "../routeSchemas/catalogSchemas.js";

export async function catalogRoutes(app: FastifyInstance) {
  app.get("/categories", catalogController.getCategories);
  app.get("/products/featured", catalogController.getFeaturedProducts);
  app.get("/products", { schema: { querystring: productQuerySchema } }, catalogController.getProducts);
  app.get("/search", { schema: { querystring: searchProductsQuerySchema } }, catalogController.searchProducts);
  app.get("/products/:slug", { schema: { params: getProductsSchema } }, catalogController.getProduct);
  app.delete("/catalog/cache", { preHandler: authenticate }, catalogController.invalidateCache);
}
