import app from "./config/server.js";
import env from "./config/env.js";
import prisma from "./config/prisma.js";
import redis from "./config/redis.js";
import { connectRedis } from "./config/redis.js";

import UserService from "./services/userService.js";

const PORT = Number(process.env.PORT) || Number(env.API_PORT);
let HOST = "0.0.0.0";

const startServer = async () => {
  try {
    await connectRedis();
    await app.listen({ port: PORT, host: HOST });
    console.log(`Server running on ${HOST}:${PORT}`);
    console.log(`API Docs: /docs`);

    // Periodically purge soft-deleted user accounts older than 90 days
    if (process.env.NODE_ENV !== "test") {
      UserService.purgeExpiredSoftDeletedUsers()
        .then((count) => {
          if (count > 0) console.log(`[Account Cleanup] Purged ${count} expired user account(s).`);
        })
        .catch(console.error);

      setInterval(() => {
        UserService.purgeExpiredSoftDeletedUsers()
          .then((count) => {
            if (count > 0) console.log(`[Account Cleanup] Purged ${count} expired user account(s).`);
          })
          .catch(console.error);
      }, 24 * 60 * 60 * 1000);
    }
  } catch (err: any) {
    // Use console.error so it appears even when pino log level is "warn"
    console.error("[FATAL] Failed to start server:", err?.message || err);
    process.exit(1);
  }
};


async function gracefulShutdown(signal: string) {
  app.log.info(`Received ${signal}. Shutting down gracefully…`);

  try {
    await app.close();
    await prisma.$disconnect();
    if (redis && (redis as any).status === "ready") await redis.quit();
  } catch (err) {
    app.log.error(`Error during shutdown: ${err}`);
  }

  app.log.info("All connections closed. Goodbye!");
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("unhandledRejection", (reason: any) => {
  console.error(`[FATAL] Unhandled Rejection: ${reason?.message || reason}`);
  process.exit(1);
});

process.on("uncaughtException", (error: Error) => {
  console.error(`[FATAL] Uncaught Exception: ${error.message}\n${error.stack}`);
  process.exit(1);
});


startServer();
