import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import UserService from "../services/userService.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess, notFoundError, internalServerError } from "../utils/response.js";
import { code } from "status-map";
import { NotFoundError } from "../utils/errors.js";

const userService = new UserService();

function handleError(err: any, res: FastifyReply) {
  if (err instanceof NotFoundError) return notFoundError(res, err.message);
  return internalServerError(res, err?.message ?? "Unexpected error");
}

export const getProfile = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const user = await userService.getProfile(req.user!.id);
  return sendSuccess(res, "Profile fetched", code("ok") as number, { user });
});

export const updateProfile = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const raw = z
    .object({
      name: z.string().min(2).max(80).optional(),
      phone: z.string().min(8).max(15).optional(),
      // Accepted from plain-JSON callers that already have a hosted URL
      avatarUrl: z.string().url().optional(),
      // Injected by avatarImageMiddleware after sharp→imgbb processing
      imageUrl: z.string().url().optional(),
    })
    .parse(req.body);

  // Prefer an explicit avatarUrl; fall back to the middleware-injected imageUrl
  const body = {
    name: raw.name,
    phone: raw.phone,
    avatarUrl: raw.avatarUrl ?? raw.imageUrl,
  };

  const user = await userService.updateProfile(req.user!.id, body);
  return sendSuccess(res, "Profile updated", code("ok") as number, { user });
});

export const getAddresses = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const addresses = await userService.getAddresses(req.user!.id);
  return sendSuccess(res, "Addresses fetched", code("ok") as number, { addresses });
});

export const addAddress = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const body = z
    .object({
      label: z.string().max(30).default("Home"),
      fullName: z.string().min(2),
      phone: z.string().min(8),
      line1: z.string().min(4),
      line2: z.string().optional(),
      city: z.string().min(2),
      state: z.string().min(2),
      pincode: z.string().min(4),
      isDefault: z.boolean().default(false),
    })
    .parse(req.body);

  const address = await userService.addAddress(req.user!.id, body);
  return sendSuccess(res, "Address added", code("created") as number, { address });
});

export const deleteAddress = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  try {
    await userService.deleteAddress(req.user!.id, id);
    return sendSuccess(res, "Address deleted", code("ok") as number, null);
  } catch (err: any) {
    return handleError(err, res);
  }
});
