import { FastifyReply, FastifyRequest } from "fastify";

type AsyncHandler = (req: FastifyRequest, reply: FastifyReply) => Promise<any>;

const asyncHandler = (fn: AsyncHandler) => async (req: FastifyRequest, reply: FastifyReply) => {
  return Promise.resolve(fn(req, reply)).catch((err: Error) => {
    throw err;
  });
};

export default asyncHandler;
