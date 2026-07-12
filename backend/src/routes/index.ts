import { adminRoutes } from "./admin.js";
import { authRoutes } from "./auth.js";
import { catalogRoutes } from "./catalog.js";
import { healthRoutes } from "./health.js";
import { orderRoutes } from "./orders.js";
import { paymentRoutes } from "./payments.js";
import { reviewRoutes } from "./reviews.js";
import { userRoutes } from "./users.js";
import { wishlistRoutes } from "./wishlist.js";
import { couponRoutes } from "./coupons.js";
import type { FastifyInstance } from "fastify";
import { pingRoutes } from "./ping.js";


function routes(app: FastifyInstance) {
  app.register(adminRoutes);
  app.register(authRoutes);
  app.register(catalogRoutes);
  app.register(healthRoutes);
  app.register(pingRoutes);
  app.register(orderRoutes);
  app.register(paymentRoutes);
  app.register(reviewRoutes);
  app.register(userRoutes);
  app.register(wishlistRoutes);
  app.register(couponRoutes);
}

export default async function rootRoutes(app: FastifyInstance) {
  await app.register(routes, { prefix: "/api/v1" });
}
