import type { FastifyInstance } from "fastify";
import { authenticate } from "../middleware/authMiddleware.js";
import * as reviewController from "../controllers/reviewController.js";

export async function reviewRoutes(app: FastifyInstance) {
  app.get("/products/:slug/reviews", reviewController.getReviews);
  app.post("/products/:slug/reviews", { preHandler: authenticate }, reviewController.createReview);
  app.post("/reviews/:id/helpful", { preHandler: authenticate }, reviewController.markHelpful);
  app.delete("/reviews/:id", { preHandler: authenticate }, reviewController.deleteReview);
}
