import { prisma } from "../../src/config/prisma.js";

export const clearDatabase = async () => {
  const modelNames = [
    "orderItem",
    "order",
    "cartItem",
    "cart",
    "review",
    "wishlist",
    "coupon",
    "product",
    "category",
    "address",
    "user",
  ];

  for (const model of modelNames) {
    try {
      // @ts-ignore
      await prisma[model].deleteMany({});
    } catch (e) {
      // Ignore errors for non-existent models or foreign key constraints (handled by order)
    }
  }
};
