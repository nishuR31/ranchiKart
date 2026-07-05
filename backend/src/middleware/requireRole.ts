import { FastifyReply, FastifyRequest } from "fastify";
import { forbiddenError } from "../utils/response.js";
import asyncHandler from "../utils/asyncHandler.js";

export const requireAdmin = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return forbiddenError(res, "Access denied. Admin role required.");
  }
});

export const requireManager = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  if (!req.user || (req.user.role !== "MANAGER" && req.user.role !== "ADMIN")) {
    return forbiddenError(res, "Access denied. Manager role required.");
  }
});

export const requireSeller = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  if (!req.user || (req.user.role !== "SELLER" && req.user.role !== "ADMIN")) {
    return forbiddenError(res, "Access denied. Seller role required.");
  }
});
