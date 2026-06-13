import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { sendWelcomeEmail } from "../lib/email.js";
import argon2 from "argon2";

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  password: z.string().min(8).max(120)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

function publicUser(user: {
  id: string;
  email: string;
  name: string;
  role: "USER" | "MANAGER" | "ADMIN";
  avatarUrl: string | null;
  phone: string | null;
  isEmailVerified: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    isEmailVerified: user.isEmailVerified
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const existing = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() }
    });

    if (existing) return reply.conflict("Email is already registered");

    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.name,
        passwordHash: await argon2.hash(body.password)
      }
    });

    // Fire-and-forget welcome email
    sendWelcomeEmail(user.email, user.name).catch(console.error);

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });
    return reply.code(201).send({ token, user: publicUser(user) });
  });

  app.post("/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() }
    });

    if (!user || !(await argon2.verify(user.passwordHash, body.password))) {
      return reply.unauthorized("Invalid email or password");
    }

    // Check if user is banned
    if (user.isBanned) {
      return reply.forbidden(JSON.stringify({
        banned: true,
        banReason: user.banReason ?? "Your account has been suspended by an administrator."
      }));
    }

    const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });
    return { token, user: publicUser(user) };
  });


  app.get("/auth/me", { preHandler: app.authenticate }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.authUser!.id }
    });
    return { user: publicUser(user) };
  });

  app.post("/auth/logout", { preHandler: app.authenticate }, async (_request, reply) => {
    // Stateless JWT — client drops the token
    return reply.send({ success: true });
  });
}
