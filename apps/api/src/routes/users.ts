import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export async function userRoutes(app: FastifyInstance) {
  // ─── Get user profile ──────────────────────────────────────────────────
  app.get("/users/me", { preHandler: app.authenticate }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.authUser!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        phone: true,
        isEmailVerified: true,
        mudraCoins: true,
        createdAt: true,
        _count: { select: { orders: true, reviews: true, wishlist: true } }
      }
    });
    return { user };
  });


  // ─── Update profile ────────────────────────────────────────────────────
  app.put("/users/me/profile", { preHandler: app.authenticate }, async (request) => {
    const body = z.object({
      name: z.string().min(2).max(80).optional(),
      phone: z.string().min(8).max(15).optional(),
      avatarUrl: z.string().url().optional()
    }).parse(request.body);

    const user = await prisma.user.update({
      where: { id: request.authUser!.id },
      data: body,
      select: {
        id: true, email: true, name: true, role: true,
        avatarUrl: true, phone: true, isEmailVerified: true
      }
    });
    return { user };
  });

  // ─── Saved addresses ───────────────────────────────────────────────────
  app.get("/users/me/addresses", { preHandler: app.authenticate }, async (request) => {
    const addresses = await prisma.savedAddress.findMany({
      where: { userId: request.authUser!.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
    });
    return { addresses };
  });

  app.post("/users/me/addresses", { preHandler: app.authenticate }, async (request, reply) => {
    const body = z.object({
      label: z.string().max(30).default("Home"),
      fullName: z.string().min(2),
      phone: z.string().min(8),
      line1: z.string().min(4),
      line2: z.string().optional(),
      city: z.string().min(2),
      state: z.string().min(2),
      pincode: z.string().min(4),
      isDefault: z.boolean().default(false)
    }).parse(request.body);

    const userId = request.authUser!.id;

    if (body.isDefault) {
      await prisma.savedAddress.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    }

    const address = await prisma.savedAddress.create({
      data: { ...body, userId }
    });
    return reply.code(201).send({ address });
  });

  app.delete("/users/me/addresses/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const address = await prisma.savedAddress.findFirst({
      where: { id, userId: request.authUser!.id }
    });
    if (!address) return reply.notFound();
    await prisma.savedAddress.delete({ where: { id } });
    return { success: true };
  });

  // ─── Change password ───────────────────────────────────────────────────
  app.put("/users/me/password", { preHandler: app.authenticate }, async (request, reply) => {
    const body = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(120)
    }).parse(request.body);

    const argon2 = await import("argon2");
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.authUser!.id } });

    if (!(await argon2.verify(user.passwordHash, body.currentPassword))) {
      return reply.unauthorized("Current password is incorrect");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await argon2.hash(body.newPassword) }
    });

    return { success: true };
  });
}
