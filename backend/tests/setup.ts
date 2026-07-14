import { mock } from "bun:test";
import { PrismaClient } from "../prisma/generated/client/index.js";

// Deep mock of PrismaClient
export const prismaMock = {
  user: {
    findUnique: mock(),
    create: mock(),
    update: mock(),
  },
  product: {
    findMany: mock(),
    count: mock(),
  },
  category: {
    findMany: mock(),
  },
} as unknown as PrismaClient;

// We must mock the prisma module BEFORE importing the app
mock.module("../src/config/prisma.js", () => {
  return {
    prisma: prismaMock,
    default: prismaMock,
  };
});

// Import app after mocking
import app from "../src/config/server.js";

// Helper to reset all mocks before each test
export function resetMocks() {
  (prismaMock.user.findUnique as ReturnType<typeof mock>).mockClear();
  (prismaMock.user.create as ReturnType<typeof mock>).mockClear();
  (prismaMock.user.update as ReturnType<typeof mock>).mockClear();
  (prismaMock.product.findMany as ReturnType<typeof mock>).mockClear();
  (prismaMock.product.count as ReturnType<typeof mock>).mockClear();
  (prismaMock.category.findMany as ReturnType<typeof mock>).mockClear();
}

export { app };
