import { FastifyReply } from "fastify";
import { code } from "status-map";

export function sendSuccess(
  res: FastifyReply,
  message: string,
  statusCode: number,
  data: Record<string, any> | string | number | boolean | null,
  details?: Record<string, any>,
) {
  return res.code(statusCode).send({
    success: true,
    message,
    data,
    details,
  });
}

export function sendError(
  res: FastifyReply,
  message: string = "Error occured",
  statusCode: number = code("internalServerError") as number,
  errors?: any,
) {
  return res.code(statusCode).send({ success: false, message, ...(errors && { errors }) });
}

export function notFoundError(
  res: FastifyReply,
  message: string = "Resource not found",
  statusCode: number = code("notFound") as number,
  details?: Record<string, any>,
) {
  return sendError(res, message, statusCode, details);
}

export function conflictError(
  res: FastifyReply,
  message: string = "Resource already exists",
  statusCode: number = code("conflict") as number,
  details?: Record<string, any>,
) {
  return sendError(res, message, statusCode, details);
}

export function badRequestError(
  res: FastifyReply,
  message: string = "Invalid request",
  statusCode: number = code("badRequest") as number,
  details?: Record<string, any>,
) {
  return sendError(res, message, statusCode, details);
}

export function unauthorizedError(
  res: FastifyReply,
  message: string = "Unauthorized access",
  statusCode: number = code("unauthorized") as number,
  details?: Record<string, any>,
) {
  return sendError(res, message, statusCode, details);
}

export function forbiddenError(
  res: FastifyReply,
  message: string = "Forbidden",
  statusCode: number = code("forbidden") as number,
  details?: Record<string, any>,
) {
  return sendError(res, message, statusCode, details);
}

export function paymentRequiredError(
  res: FastifyReply,
  message: string = "Payment required",
  statusCode: number = code("paymentRequired") as number,
  details?: Record<string, any>,
) {
  return sendError(res, message, statusCode, details);
}

export function redirectionError(
  res: FastifyReply,
  message: string = "Redirecting to login page",
  statusCode: number = code("found") as number,
  details?: Record<string, any>,
) {
  return sendError(res, message, statusCode, details);
}

export function rateLimitError(
  res: FastifyReply,
  message: string = "Rate limit exceeded",
  statusCode: number = code("tooManyRequests") as number,
  details?: Record<string, any>,
) {
  return sendError(res, message, statusCode, details);
}

export function internalServerError(
  res: FastifyReply,
  message: string = "Internal server error",
  statusCode: number = code("internalServerError") as number,
  details?: Record<string, any>,
) {
  return sendError(res, message, statusCode, details);
}

export function methodNotAllowedError(
  res: FastifyReply,
  message: string = "Method not allowed",
  statusCode: number = code("methodNotAllowed") as number,
  details?: Record<string, any>,
) {
  return sendError(res, message, statusCode, details);
}

export function validationError(
  res: FastifyReply,
  message: string = "Validation error",
  statusCode: number = code("badRequest") as number,
  details?: Record<string, any>,
) {
  return sendError(res, message, statusCode, details);
}
