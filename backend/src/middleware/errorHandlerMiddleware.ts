import { FastifyReply, FastifyRequest } from "fastify";

import { AppError } from "../utils/errors.js";
import env from "../config/env.js";
import { sendError } from "../utils/response.js";

export default function errorHandler(err: any, req: FastifyRequest, res: FastifyReply) {
  if (!(err instanceof AppError)) {
    req.log.error(err);
    err = new AppError("Something went wrong. Please try again.", err?.statusCode || 500);
  }

  const { message, statusCode, name, stack, details } = err;

  const errDetails = env.NODE_ENV === "development" ? { name, stack, details } : undefined;

  sendError(res, message, statusCode, errDetails);
}
