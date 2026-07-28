process.env.NODE_ENV = "test";

const isBun = typeof process.versions.bun !== "undefined";
const { beforeAll, afterAll } = isBun ? await import("bun:test") : await import("vitest");

import app from "../src/config/server.js";
import { prisma } from "../src/config/prisma.js";
import { generatePerformanceReport } from "./utils/report.js";

beforeAll(async () => {
  // Ensure app is ready before any tests run
  await app.ready();
});

afterAll(async () => {
  // Close database connections and server
  await prisma.$disconnect();
  await app.close();
  generatePerformanceReport();
});
