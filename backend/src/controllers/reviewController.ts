import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import ReviewService from "../services/reviewService.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  sendSuccess,
  notFoundError,
  conflictError,
  forbiddenError,
  internalServerError,
} from "../utils/response.js";
import { code } from "status-map";
import { ConflictError, ForbiddenError, NotFoundError } from "../utils/errors.js";

const reviewService = new ReviewService();

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().min(10).max(2000),
});

function handleError(err: any, res: FastifyReply) {
  if (err instanceof NotFoundError) return notFoundError(res, err.message);
  if (err instanceof ConflictError) return conflictError(res, err.message);
  if (err instanceof ForbiddenError) return forbiddenError(res, err.message);
  return internalServerError(res, err?.message ?? "Unexpected error");
}

export const getReviews = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { slug } = z.object({ slug: z.string() }).parse(req.params);
  const query = z
    .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(20).default(10),
    })
    .parse(req.query);

  try {
    const data = await reviewService.getReviews(slug, query);
    return sendSuccess(res, "Reviews fetched", code("ok") as number, data);
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const createReview = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { slug } = z.object({ slug: z.string() }).parse(req.params);
  const body = createReviewSchema.parse(req.body);

  try {
    const review = await reviewService.createReview(slug, req.user!.id, body);
    return sendSuccess(res, "Review created", code("created") as number, { review });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const markHelpful = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  try {
    const review = await reviewService.markHelpful(id);
    return sendSuccess(res, "Marked as helpful", code("ok") as number, { review });
  } catch (err: any) {
    return handleError(err, res);
  }
});

export const deleteReview = asyncHandler(async (req: FastifyRequest, res: FastifyReply) => {
  const { id } = z.object({ id: z.string() }).parse(req.params);
  try {
    await reviewService.deleteReview(id, req.user!.id, req.user!.role);
    return sendSuccess(res, "Review deleted", code("ok") as number, null);
  } catch (err: any) {
    return handleError(err, res);
  }
});
