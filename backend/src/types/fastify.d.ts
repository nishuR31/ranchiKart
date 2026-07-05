import type { Role } from "@prisma/client";
import "fastify";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser;
  }
}
