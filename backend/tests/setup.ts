import { mock } from "bun:test";
import { prismaMock, getModelMocks } from "./prismaMockInit.js";

export { prismaMock };

// We must mock the prisma module BEFORE importing the app
const prismaMockExports = {
  prisma: prismaMock,
  default: prismaMock,
};
mock.module("../src/config/prisma.js", () => prismaMockExports);
mock.module("../src/config/prisma.ts", () => prismaMockExports);
mock.module("../config/prisma.js", () => prismaMockExports);
mock.module("../config/prisma.ts", () => prismaMockExports);
mock.module("/home/nishu/TechStack/codes/RanchiKart/backend/src/config/prisma.ts", () => prismaMockExports);
mock.module("/home/nishu/TechStack/codes/RanchiKart/backend/src/config/prisma.js", () => prismaMockExports);

import app from "../src/config/server.js";

// Helper to reset all mocks before each test
export function resetMocks() {
  for (const model of getModelMocks()) {
    for (const key of Object.keys(model)) {
      const field = model[key];
      if (field && typeof field.mockClear === "function") {
        field.mockClear();
      }
    }
  }
}

export { app };
