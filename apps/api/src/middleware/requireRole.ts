import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "@prisma/client";

// Role hierarchy: USER < MANAGER < ADMIN
const ROLE_RANK: Record<Role, number> = {
  USER: 0,
  MANAGER: 1,
  ADMIN: 2
};

/**
 * Factory that returns a Fastify preHandler function requiring the authenticated
 * user to have at least `minimumRole` rank.  Must be used AFTER app.authenticate.
 *
 * Usage:
 *   { preHandler: [app.authenticate, requireRole("ADMIN")] }
 */
export function requireRole(minimumRole: Role) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.authUser;
    if (!user) {
      return reply.unauthorized("Authentication required");
    }
    const userRank = ROLE_RANK[user.role as Role] ?? 0;
    const requiredRank = ROLE_RANK[minimumRole];
    if (userRank < requiredRank) {
      return reply.forbidden(
        `Access denied. Requires ${minimumRole} role or above.`
      );
    }
  };
}

// Convenience exports
export const requireAdmin = requireRole("ADMIN");
export const requireManager = requireRole("MANAGER");
