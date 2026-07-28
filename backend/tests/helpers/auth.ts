import app from "../../src/config/server.js";
import { userFactory } from "../factories/user.factory.js";
import { prisma } from "../../src/config/prisma.js";

let adminToken: string | null = null;
let userToken: string | null = null;

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 400));
      return withRetry(fn, retries - 1);
    }
    throw err;
  }
}

export const getAdminToken = async () => {
  await app.ready();
  if (adminToken) return adminToken;

  const email = "dreamgf691+admin@gmail.com";
  const password = "AdminPassword123!";
  
  let admin = await withRetry(() => prisma.user.findUnique({ where: { email } }));
  if (!admin) {
    admin = await userFactory.create({ email, password, role: "ADMIN", isEmailVerified: true });
  } else {
    const { hash } = await import("bcryptjs");
    const hashedPassword = await hash(password, 10);
    await withRetry(() => prisma.user.update({
      where: { email },
      data: { passwordHash: hashedPassword, role: "ADMIN", isEmailVerified: true, isDeleted: false },
    }));
  }

  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { emailOrUsername: email, password },
  });

  const body = JSON.parse(res.payload);
  adminToken = body.data.tokens.accessToken;
  return adminToken;
};

export const getUserToken = async () => {
  await app.ready();
  if (userToken) return userToken;

  const email = "dreamgf691+user@gmail.com";
  const password = "UserPassword123!";
  
  let user = await withRetry(() => prisma.user.findUnique({ where: { email } }));
  if (!user) {
    user = await userFactory.create({ email, password, role: "USER", isEmailVerified: true });
  } else {
    const { hash } = await import("bcryptjs");
    const hashedPassword = await hash(password, 10);
    await withRetry(() => prisma.user.update({
      where: { email },
      data: { passwordHash: hashedPassword, isEmailVerified: true, isDeleted: false, deletedAt: null, scheduledHardDeleteAt: null },
    }));
  }

  const res = await app.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { emailOrUsername: email, password },
  });

  const body = JSON.parse(res.payload);
  userToken = body.data.tokens.accessToken;
  return userToken;
};

export const clearTokens = () => {
  adminToken = null;
  userToken = null;
};
