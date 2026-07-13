import Fastify from "fastify";
import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import sensible from "@fastify/sensible";
import helmet from "@fastify/helmet";
import { publicRoutes } from "../routes/public.js";
import compress from "@fastify/compress";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { ZodError } from "zod";
import env from "./env.js"; // lib env


// Route imports
// import { authRoutes } from "../routes/auth.js";
// import { catalogRoutes } from "../routes/catalog.js";
// import { healthRoutes } from "../routes/health.js";
// import { orderRoutes } from "../routes/orders.js";
// import { paymentRoutes } from "../routes/payments.js";
// import { reviewRoutes } from "../routes/reviews.js";
// import { wishlistRoutes } from "../routes/wishlist.js";
// import { couponRoutes } from "../routes/coupons.js";
// import { adminRoutes } from "../routes/admin.js";
// import { userRoutes } from "../routes/users.js";
import rootRoutes from "../routes/index.js";

const app = Fastify({
  logger:
    env.NODE_ENV === "development"
      ? {
        level: "info",
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
      : {
        level: "warn",
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
      contact: { name: "Backend Team", email: env.SMTP_USER },
    },
    servers: [
      { url: `http://localhost:${env.API_PORT}`, description: "Development" },
      { url: `https://ranchikart.onrender.com`, description: "Production" }
    ],
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
app.get("/", async (req: FastifyRequest, reply: FastifyReply) => {
  return reply.send({
    message: "Server fired up",
    url: `${req.protocol}://${req.hostname}${req.url}`,
  });
});

// Routes registration
await app.register(publicRoutes);
await app.register(rootRoutes);


export default app;
