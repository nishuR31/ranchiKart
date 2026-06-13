import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../env.js";

export type TokenPayload = {
  id: string;
  email: string;
  role: "USER" | "MANAGER" | "ADMIN";
};

export const authPlugin = fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN }
  });

  // Strict: throws 401 if no/invalid token
  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await request.jwtVerify<TokenPayload>();
      request.authUser = payload;
    } catch {
      return reply.unauthorized("Login required");
    }
  });

  // Lenient: populates authUser if token present, does NOT throw if absent
  app.decorate("authenticateOptional", async (request: FastifyRequest) => {
    try {
      const payload = await request.jwtVerify<TokenPayload>();
      request.authUser = payload;
    } catch {
      // no-op — optional auth
    }
  });
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    authenticateOptional(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

