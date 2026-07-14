import { mock } from "bun:test";
import { PrismaClient } from "../prisma/generated/client/index.js";

const modelMocks = new Map<string, any>();

function createMockModel() {
  return {
    findUnique: mock(),
    findFirst: mock(),
    create: mock(),
    update: mock(),
    delete: mock(),
    findMany: mock(),
    count: mock(),
  };
}

export const prismaMock = new Proxy({} as any, {
  get(target, prop: string) {
    if (prop === "$disconnect" || prop === "$connect") {
      return async () => {};
    }
    if (prop === "$extends") {
      return () => prismaMock;
    }
    if (typeof prop === "string" && !prop.startsWith("$")) {
      if (!modelMocks.has(prop)) {
        modelMocks.set(prop, createMockModel());
      }
      return modelMocks.get(prop);
    }
    return target[prop];
  }
}) as unknown as PrismaClient;

(globalThis as any).prisma = prismaMock;

export function getModelMocks() {
  return Array.from(modelMocks.values());
}
