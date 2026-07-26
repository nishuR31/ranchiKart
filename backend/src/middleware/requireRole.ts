import { FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError } from "../utils/errors.js";
import asyncHandler from "../utils/asyncHandler.js";

export const requireAdmin = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  if (!req.user || req.user.role !== "ADMIN") {
    throw new ForbiddenError("Access denied. Admin role required.");
  }
});

export const requireManager = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  if (!req.user || (req.user.role !== "MANAGER" && req.user.role !== "ADMIN")) {
    throw new ForbiddenError("Access denied. Manager role required.");
  }
});

export const requireSeller = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  if (!req.user || (req.user.role !== "SELLER" && req.user.role !== "ADMIN")) {
    throw new ForbiddenError("Access denied. Seller role required.");
  }
});
