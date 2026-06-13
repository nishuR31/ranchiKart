import Fastify from "fastify";
import type { FastifyError } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import helmet from "@fastify/helmet";
import compress from "@fastify/compress";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { ZodError } from "zod";
import { env } from "./env.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";
import { authPlugin } from "./plugins/auth.js";
import { rateLimitPlugin } from "./plugins/rateLimit.js";
import { authRoutes } from "./routes/auth.js";
import { catalogRoutes } from "./routes/catalog.js";
import { healthRoutes } from "./routes/health.js";
import { orderRoutes } from "./routes/orders.js";
import { paymentRoutes } from "./routes/payments.js";
import { reviewRoutes } from "./routes/reviews.js";
import { wishlistRoutes } from "./routes/wishlist.js";
import { couponRoutes } from "./routes/coupons.js";
import { adminRoutes } from "./routes/admin.js";
import { userRoutes } from "./routes/users.js";

const app = Fastify({
  logger: {
    level: env.NODE_ENV === "development" ? "info" : "warn",
    ...(env.NODE_ENV === "development"
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" }
          }
        }
      : {})
  }
});

// ─── Error Handler ──────────────────────────────────────────────────────────
app.setErrorHandler((error: FastifyError, _request, reply) => {
  if (error instanceof ZodError) {
    return reply.badRequest(error.issues.map((issue) => issue.message).join(", "));
  }
  app.log.error(error);
  return reply.status(error.statusCode ?? 500).send({
    statusCode: error.statusCode ?? 500,
    error: error.name,
    message: error.message
  });
});

// ─── Security & Compression ─────────────────────────────────────────────────
await app.register(helmet, {
  contentSecurityPolicy: false, // Swagger UI needs this off
  crossOriginEmbedderPolicy: false
});
await app.register(compress, { global: true });

// ─── CORS ────────────────────────────────────────────────────────────────────
await app.register(cors, {
  origin: [env.WEB_ORIGIN, "http://localhost:5173", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
});

// ─── Swagger Docs ────────────────────────────────────────────────────────────
await app.register(swagger, {
  openapi: {
    info: {
      title: "exKArt API",
      description:
        "Production-ready e-commerce API for custom stamps, stationery, and boards. Built with Fastify + Prisma + PostgreSQL.",
      version: "1.0.0",
      contact: { name: "exKArt Team", email: "api@exkart.in" }
    },
    servers: [{ url: `http://localhost:${env.API_PORT}`, description: "Development" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
      }
    }
  }
});

await app.register(swaggerUi, {
  routePrefix: "/docs",
  uiConfig: { deepLinking: true, displayRequestDuration: true },
  staticCSP: false
});

// ─── Plugins ─────────────────────────────────────────────────────────────────
await app.register(sensible);
await app.register(rateLimitPlugin);
await app.register(authPlugin);

// ─── Routes ──────────────────────────────────────────────────────────────────
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

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
const shutdown = async () => {
  app.log.info("Shutting down server...");
  await app.close();
  await prisma.$disconnect();
  if (redis?.status === "ready") await redis.quit();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ─── Start ───────────────────────────────────────────────────────────────────
await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
app.log.info(`📖 API Docs: http://localhost:${env.API_PORT}/docs`);
