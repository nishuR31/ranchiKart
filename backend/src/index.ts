import app from "./config/server.js";
import env from "./config/env.js";

const startServer = async () => {
  try {
    await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
    app.log.info(`📖 API Docs: http://localhost:${env.API_PORT}/docs`);
  } catch (err: any) {
    app.log.error(err?.message || err);
    process.exit(1);
  }
};

startServer();

async function gracefulShutdown(signal: string) {
  app.log.info(`Received ${signal}. Shutting down gracefully…`);

  try {
    await app.close();
  } catch (err) {
    app.log.error(`Error closing server: ${err}`);
  }

  app.log.info("All connections closed. Goodbye!");
  process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("unhandledRejection", (reason: any) => {
  app.log.error(`Unhandled Rejection: ${reason?.message || reason}`);
});

process.on("uncaughtException", (error: Error) => {
  app.log.error(`Uncaught Exception: ${error.message}\n${error.stack}`);
  process.exit(1);
});
