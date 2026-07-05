import { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "../utils/jwt.js";
import { unauthorizedError } from "../utils/response.js";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../types/index.js";

export const authenticate = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const authHeader = req.headers.authorization;
  let token = "";

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies && req.cookies.refreshToken) {
    token = req.cookies.refreshToken;
  }

  if (!token) {
    return unauthorizedError(res, "Access denied. No token provided. Please log in.");
  }

  try {
    const decoded = await verifyAccessToken(token);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    } as User;
  } catch (err) {
    return unauthorizedError(res, "Access denied. Invalid or expired token.");
  }
});
