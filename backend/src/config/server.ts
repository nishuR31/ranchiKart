import Fastify from "fastify";
import type { FastifyInstance, FastifyError } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import sensible from "@fastify/sensible";
import helmet from "@fastify/helmet";
import compress from "@fastify/compress";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { ZodError } from "zod";
import env from "./env.js"; // lib env
import prisma from "./prisma.js";
import redis from "./redis.js";

// Route imports
import { authRoutes } from "../routes/auth.js";
import { catalogRoutes } from "../routes/catalog.js";
import { healthRoutes } from "../routes/health.js";
import { orderRoutes } from "../routes/orders.js";
import { paymentRoutes } from "../routes/payments.js";
import { reviewRoutes } from "../routes/reviews.js";
import { wishlistRoutes } from "../routes/wishlist.js";
import { couponRoutes } from "../routes/coupons.js";
import { adminRoutes } from "../routes/admin.js";
import { userRoutes } from "../routes/users.js";

const app: FastifyInstance = Fastify({
  logger: {
    level: env.NODE_ENV === "development" ? "info" : "warn",
    ...(env.NODE_ENV === "development"
      ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
      : {}),
  },
});

// Error handler
app.setErrorHandler((error: FastifyError, _request, reply) => {
  if (error instanceof ZodError) {
    return reply.badRequest(error.issues.map((i) => i.message).join(", "));
  }
  app.log.error(error);
  return reply.status(error.statusCode ?? 500).send({
    statusCode: error.statusCode ?? 500,
    message: error.message,
    error: error.name,
  });
});

// Security & compression
await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", env.WEB_ORIGIN],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  referrerPolicy: { policy: "no-referrer" },
  permissionsPolicy: { features: {} },
});
await app.register(compress, { global: true });
await app.register(cookie);
// CORS
await app.register(cors, {
  origin: [env.WEB_ORIGIN, "http://localhost:5173", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

// Swagger docs
await app.register(swagger, {
  openapi: {
    info: {
      title: "Backend",
      description:
        "Production-ready e-commerce API for Ranchi and scalable global marketplace. Built with Fastify + Prisma + PostgreSQL.",
      version: "1.3.4",
      contact: { name: "Backend Team", email: "[EMAIL_ADDRESS]" },
    },
    servers: [{ url: `http://localhost:${env.API_PORT}`, description: "Development" }],
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    },
  },
});
await app.register(swaggerUi, {
  routePrefix: "/docs",
  uiConfig: { deepLinking: true, displayRequestDuration: true },
  staticCSP: false,
});

// Plugins
await app.register(sensible);

// Routes registration
await app.register(healthRoutes);
await app.register(authRoutes);
await app.register(catalogRoutes);
await app.register(orderRoutes);
await app.register(paymentRoutes);
await app.register(reviewRoutes);
await app.register(wishlistRoutes);
await app.register(couponRoutes);
await app.register(adminRoutes);
await app.register(userRoutes);

// Graceful shutdown
const shutdown = async () => {
  app.log.info("Shutting down server...");
  await app.close();
  await prisma.$disconnect();
  if (redis?.status === "ready") await redis.quit();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Export app for index
export default app;
