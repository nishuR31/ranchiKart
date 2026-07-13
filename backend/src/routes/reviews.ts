import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authMiddleware.js";
import * as reviewController from "../controllers/reviewController.js";
import { getReviewsQuerySchema, createReviewSchema, reviewIdParamSchema, reviewProductSlugSchema } from "../routeSchemas/reviewSchemas.js";

export async function reviewRoutes(app: FastifyInstance) {
  app.get("/products/:slug/reviews", { schema: { querystring: getReviewsQuerySchema, params: reviewProductSlugSchema } }, reviewController.getReviews);
  app.post("/products/:slug/reviews", { preHandler: authenticate, schema: { body: createReviewSchema, params: reviewProductSlugSchema } }, reviewController.createReview);
  app.post("/reviews/:id/helpful", { preHandler: authenticate, schema: { params: reviewIdParamSchema } }, reviewController.markHelpful);
  app.delete("/reviews/:id", { preHandler: authenticate, schema: { params: reviewIdParamSchema } }, reviewController.deleteReview);
}
