import { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "../utils/jwt.js";
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../types/index.js";
import { prisma } from "../config/prisma.js";

export const authenticate = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : req.cookies?.accessToken;

  if (!token) {
    throw new UnauthorizedError("Access denied. No token provided. Please log in.");
  }

  try {
    const decoded = await verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, isBanned: true, banReason: true, isDeleted: true },
    });

    if (!user) {
      throw new UnauthorizedError("Your session is no longer valid. Please log in again.");
    }
    if (user.isBanned) {
      throw new ForbiddenError(user.banReason || "This account has been suspended. Please contact support.");
    }
    if (user.isDeleted) {
      throw new ForbiddenError("This account has been deactivated. Please contact support to restore access.");
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    } as User;
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
      throw err;
    }
    throw new UnauthorizedError("Access denied. Invalid or expired token.");
  }
});

export const authorize = (...roles: string[]) => {
  return asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
    if (!req.user) {
      throw new UnauthorizedError("You must be logged in to perform this action.");
    }
    
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError("You do not have permission to perform this action.");
    }
  });
};
