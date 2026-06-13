import type { FastifyInstance } from "fastify";


export async function requireAdmin(app: FastifyInstance) {
  app.addHook("preHandler", async (request, reply) => {
    await app.authenticate(request, reply);
    if (request.authUser?.role !== "ADMIN") {
      return reply.forbidden("Admin access required");
    }
  });
}
