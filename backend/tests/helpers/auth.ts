import app from "../../src/config/server.js";
import { userFactory } from "../factories/user.factory.js";
import { prisma } from "../../src/config/prisma.js";

let adminToken: string | null = null;
let userToken: string | null = null;

export const getAdminToken = async () => {
  if (adminToken) return adminToken;

  const email = "dreamgf691+admin@gmail.com";
  const password = "AdminPassword123!";
  
  let admin = await prisma.user.findUnique({ where: { email } });
  if (!admin) {
    admin = await userFactory.create({ email, password, role: "ADMIN", isEmailVerified: true });
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
  if (userToken) return userToken;

  const email = "dreamgf691+user@gmail.com";
  const password = "UserPassword123!";
  
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await userFactory.create({ email, password, role: "USER", isEmailVerified: true });
  } else if (user.isDeleted) {
    await prisma.user.update({
      where: { email },
      data: { isDeleted: false, deletedAt: null, scheduledHardDeleteAt: null },
    });
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
