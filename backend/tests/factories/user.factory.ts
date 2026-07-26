import { faker } from "@faker-js/faker";
import { prisma } from "../../src/config/prisma.js";

export const userFactory = {
  build: (overrides = {}) => ({
    email: "dreamgf691@gmail.com",
    password: "Password123!",
    name: faker.person.fullName(),
    phone: faker.phone.number({ style: 'national' }).replace(/[^0-9]/g, '').slice(0, 10),
    ...overrides,
  }),
  create: async (overrides = {}) => {
    const data = userFactory.build(overrides);
    const { hash } = await import("bcryptjs");
    const hashedPassword = await hash(data.password, 10);
    return prisma.user.create({
      data: {
        ...data,
        passwordHash: hashedPassword,
        isEmailVerified: true,
      },
    });
  },
};
