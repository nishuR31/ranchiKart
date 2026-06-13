import type { FastifyInstance } from "fastify";
import { OrderStatus, type Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { sendOrderStatusUpdate } from "../lib/email.js";
import { requireAdmin, requireManager } from "../middleware/requireRole.js";

// All admin routes use [app.authenticate, requireAdmin] or [app.authenticate, requireManager]
export async function adminRoutes(app: FastifyInstance) {
  const adminGuard = { preHandler: [app.authenticate, requireAdmin] };
  const managerGuard = { preHandler: [app.authenticate, requireManager] };

  // ─── Dashboard Stats ──────────────────────────────────────────────────
  app.get("/admin/dashboard", managerGuard, async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalOrders,
      totalUsers,
      totalProducts,
      revenueData,
      monthlyOrders,
      lastMonthOrders,
      recentOrders,
      topProducts,
      statusBreakdown,
      rawRevenueChart
    ] = await Promise.all([
      prisma.order.count(),
      prisma.user.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.aggregate({
        where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
        _sum: { total: true }
      }),
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.order.count({
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } }
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          items: { include: { product: { select: { name: true, imageUrl: true } } } }
        }
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: "desc" } },
        take: 5
      }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { status: true }
      }),
      // Raw revenue per day for last 30 days
      prisma.order.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] }
        },
        select: { createdAt: true, total: true }
      })
    ]);

    // Build daily revenue chart data
    const dailyRevenue: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyRevenue[key] = 0;
    }
    for (const order of rawRevenueChart) {
      const key = order.createdAt.toISOString().slice(0, 10);
      if (key in dailyRevenue) dailyRevenue[key] = (dailyRevenue[key] ?? 0) + order.total;
    }
    const revenueChart = Object.entries(dailyRevenue).map(([date, revenue]) => ({
      date,
      revenue
    }));

    const topProductDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, imageUrl: true, slug: true }
        });
        return { ...item, product };
      })
    );

    return {
      stats: {
        totalOrders,
        totalUsers,
        totalProducts,
        totalRevenue: revenueData._sum.total ?? 0,
        monthlyOrders,
        lastMonthOrders,
        monthGrowth:
          lastMonthOrders === 0
            ? 100
            : Math.round(((monthlyOrders - lastMonthOrders) / lastMonthOrders) * 100)
      },
      recentOrders,
      topProducts: topProductDetails,
      statusBreakdown,
      revenueChart
    };
  });

  // ─── All Orders (admin/manager) ───────────────────────────────────────
  app.get("/admin/orders", managerGuard, async (request) => {
    const query = z
      .object({
        status: z.nativeEnum(OrderStatus).optional(),
        search: z.string().optional(),
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(50).default(20),
        from: z.string().optional(),
        to: z.string().optional()
      })
      .parse(request.query);

    const where: Prisma.OrderWhereInput = {
      status: query.status,
      createdAt: {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined
      }
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { include: { product: { select: { name: true, imageUrl: true } } } },
          coupon: { select: { code: true } }
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.order.count({ where })
    ]);

    return { orders, total, page: query.page, limit: query.limit };
  });

  // ─── Update order status ──────────────────────────────────────────────
  app.put("/admin/orders/:id/status", managerGuard, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = z
      .object({
        status: z.nativeEnum(OrderStatus),
        trackingId: z.string().optional(),
        notes: z.string().optional()
      })
      .parse(request.body);

    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: true }
    });
    if (!order) return reply.notFound("Order not found");

    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: body.status,
        ...(body.trackingId ? { trackingId: body.trackingId } : {}),
        ...(body.notes ? { notes: body.notes } : {})
      }
    });

    // Award MudraCoins when order is marked DELIVERED (10 coins = ₹100 value)
    // Award MudraCoins when order DELIVERED & order >= ₹1000 (100000 paisa)
    const COINS_PER_DELIVERY = 10;
    const MIN_ORDER_FOR_COINS = 100_000; // ₹1,000 in paisa
    const eligibleForCoins = body.status === "DELIVERED" && order.status !== "DELIVERED" && order.total >= MIN_ORDER_FOR_COINS;
    if (eligibleForCoins) {
      await prisma.user.update({
        where: { id: order.userId },
        data: { mudraCoins: { increment: COINS_PER_DELIVERY } }
      });
      await prisma.adminLog.create({
        data: {
          adminId: request.authUser!.id,
          action: "AWARD_MUDRACOINS",
          entity: "User",
          entityId: order.userId,
          meta: { coins: COINS_PER_DELIVERY, orderTotal: order.total, reason: `Order ${id} delivered` }
        }
      });
    }

    await prisma.adminLog.create({
      data: {
        adminId: request.authUser!.id,
        action: "UPDATE_ORDER_STATUS",
        entity: "Order",
        entityId: id,
        meta: { newStatus: body.status, oldStatus: order.status, trackingId: body.trackingId }
      }
    });

    sendOrderStatusUpdate(
      order.user.email,
      order.user.name,
      order.id,
      body.status,
      body.trackingId
    ).catch(console.error);

    return { order: updated, coinsAwarded: body.status === "DELIVERED" && order.status !== "DELIVERED" ? COINS_PER_DELIVERY : 0 };
  });


  // ─── Admin product management ─────────────────────────────────────────
  app.get("/admin/products", managerGuard, async (request) => {
    const query = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(50).default(20),
        search: z.string().optional(),
        isActive: z.coerce.boolean().optional(),
        kind: z.enum(["STAMP", "STATIONERY", "BOARD"]).optional()
      })
      .parse(request.query);

    const where: Prisma.ProductWhereInput = {
      isActive: query.isActive,
      kind: query.kind,
      name: query.search ? { contains: query.search, mode: "insensitive" } : undefined
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, _count: { select: { orderItems: true, reviews: true } } },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.product.count({ where })
    ]);

    return { products, total, page: query.page, limit: query.limit };
  });

  // ─── Create product (admin only) ──────────────────────────────────────
  app.post("/admin/products", adminGuard, async (request, reply) => {
    const body = z
      .object({
        categoryId: z.string(),
        slug: z.string().min(2),
        name: z.string().min(2),
        description: z.string().min(10),
        kind: z.enum(["STAMP", "STATIONERY", "BOARD"]),
        imageUrl: z.string().url(),
        basePrice: z.number().int().positive(),
        stock: z.number().int().nonnegative().default(100),
        isFeatured: z.boolean().default(false),
        tags: z.array(z.string()).default([]),
        highlights: z.array(z.string()).default([]),
        specifications: z.record(z.string()).default({}),
        dispatchDays: z.number().int().positive().default(3),
        minWidthMm: z.number().int().positive().optional(),
        maxWidthMm: z.number().int().positive().optional(),
        minHeightMm: z.number().int().positive().optional(),
        maxHeightMm: z.number().int().positive().optional()
      })
      .parse(request.body);

    const existing = await prisma.product.findUnique({ where: { slug: body.slug } });
    if (existing) return reply.conflict("Product slug already exists");

    const product = await prisma.product.create({ data: { ...body, currency: "INR" } });

    await prisma.adminLog.create({
      data: {
        adminId: request.authUser!.id,
        action: "CREATE_PRODUCT",
        entity: "Product",
        entityId: product.id,
        meta: { name: product.name, slug: product.slug }
      }
    });

    return reply.code(201).send({ product });
  });

  app.patch("/admin/products/:id/toggle", managerGuard, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return reply.notFound();
    const updated = await prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive }
    });
    await prisma.adminLog.create({
      data: {
        adminId: request.authUser!.id,
        action: updated.isActive ? "ACTIVATE_PRODUCT" : "DEACTIVATE_PRODUCT",
        entity: "Product",
        entityId: id
      }
    });
    return { product: updated };
  });

  app.patch("/admin/products/:id/featured", managerGuard, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return reply.notFound();
    const updated = await prisma.product.update({
      where: { id },
      data: { isFeatured: !product.isFeatured }
    });
    await prisma.adminLog.create({
      data: {
        adminId: request.authUser!.id,
        action: updated.isFeatured ? "FEATURE_PRODUCT" : "UNFEATURE_PRODUCT",
        entity: "Product",
        entityId: id
      }
    });
    return { product: updated };
  });

  // ─── Update product details (admin only) ──────────────────────────────
  app.put("/admin/products/:id", adminGuard, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = z
      .object({
        name: z.string().min(2).optional(),
        description: z.string().min(10).optional(),
        basePrice: z.number().int().positive().optional(),
        stock: z.number().int().nonnegative().optional(),
        dispatchDays: z.number().int().positive().optional(),
        imageUrl: z.string().url().optional(),
        tags: z.array(z.string()).optional(),
        highlights: z.array(z.string()).optional(),
        specifications: z.record(z.string()).optional()
      })
      .parse(request.body);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return reply.notFound("Product not found");

    const updated = await prisma.product.update({ where: { id }, data: body });
    await prisma.adminLog.create({
      data: {
        adminId: request.authUser!.id,
        action: "UPDATE_PRODUCT",
        entity: "Product",
        entityId: id,
        meta: body
      }
    });
    return { product: updated };
  });

  // ─── Admin users ──────────────────────────────────────────────────────
  app.get("/admin/users", managerGuard, async (request) => {
    const query = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
        search: z.string().optional(),
        role: z.enum(["USER", "MANAGER", "ADMIN"]).optional()
      })
      .parse(request.query);

    const where: Prisma.UserWhereInput = {
      role: query.role,
      OR: query.search
        ? [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } }
          ]
        : undefined
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          isEmailVerified: true,
          isBanned: true,
          banReason: true,
          mudraCoins: true,
          createdAt: true,
          _count: { select: { orders: true, reviews: true } }
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.user.count({ where })
    ]);

    return { users, total, page: query.page, limit: query.limit };
  });

  // ─── Ban / Unban user (admin only) ───────────────────────────────────
  app.patch("/admin/users/:id/ban", adminGuard, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = z.object({
      isBanned: z.boolean(),
      banReason: z.string().max(300).optional()
    }).parse(request.body);

    if (id === request.authUser!.id) return reply.badRequest("Cannot ban yourself");

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reply.notFound("User not found");

    const updated = await prisma.user.update({
      where: { id },
      data: { isBanned: body.isBanned, banReason: body.isBanned ? (body.banReason ?? null) : null },
      select: { id: true, email: true, name: true, role: true, isBanned: true, banReason: true }
    });

    await prisma.adminLog.create({
      data: {
        adminId: request.authUser!.id,
        action: body.isBanned ? "BAN_USER" : "UNBAN_USER",
        entity: "User",
        entityId: id,
        meta: { reason: body.banReason, targetEmail: user.email }
      }
    });

    return { user: updated };
  });

  // ─── Promote / demote user role (admin only) ─────────────────────────
  app.patch("/admin/users/:id/role", adminGuard, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = z.object({ role: z.enum(["USER", "MANAGER", "ADMIN"]) }).parse(request.body);

    // Don't let admin demote themselves
    if (id === request.authUser!.id) return reply.badRequest("Cannot change your own role");

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reply.notFound("User not found");

    const updated = await prisma.user.update({
      where: { id },
      data: { role: body.role },
      select: { id: true, email: true, name: true, role: true }
    });

    await prisma.adminLog.create({
      data: {
        adminId: request.authUser!.id,
        action: "UPDATE_USER_ROLE",
        entity: "User",
        entityId: id,
        meta: { oldRole: user.role, newRole: body.role }
      }
    });

    return { user: updated };
  });

  // ─── Coupon Management ────────────────────────────────────────────────
  app.get("/admin/coupons", managerGuard, async (request) => {
    const query = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(50).default(20),
        isActive: z.coerce.boolean().optional()
      })
      .parse(request.query);

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where: { isActive: query.isActive },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          _count: { select: { orders: true } },
          category: { select: { id: true, name: true, slug: true } }
        }
      }),
      prisma.coupon.count({ where: { isActive: query.isActive } })
    ]);

    return { coupons, total, page: query.page };
  });

  app.post("/admin/coupons", adminGuard, async (request, reply) => {
    const body = z
      .object({
        code: z.string().min(3).max(30).toUpperCase(),
        description: z.string().optional(),
        type: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
        value: z.number().int().positive(),
        minOrderAmount: z.number().int().nonnegative().default(0),
        maxUses: z.number().int().positive().optional(),
        expiresAt: z.string().optional().transform((v) => {
          if (!v) return undefined;
          const d = new Date(v);
          if (isNaN(d.getTime())) throw new Error("Invalid expiry date");
          return d.toISOString();
        }),
        categoryId: z.string().optional()
      })
      .parse(request.body);

    const existing = await prisma.coupon.findUnique({ where: { code: body.code } });
    if (existing) return reply.conflict("Coupon code already exists");

    const coupon = await prisma.coupon.create({
      data: {
        ...body,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        categoryId: body.categoryId || undefined
      },
      include: { category: { select: { id: true, name: true, slug: true } } }
    });

    await prisma.adminLog.create({
      data: {
        adminId: request.authUser!.id,
        action: "CREATE_COUPON",
        entity: "Coupon",
        entityId: coupon.id,
        meta: { code: coupon.code, type: coupon.type, value: coupon.value, categoryId: body.categoryId }
      }
    });

    return reply.code(201).send({ coupon });
  });

  app.put("/admin/coupons/:id", adminGuard, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = z
      .object({
        description: z.string().optional(),
        value: z.number().int().positive().optional(),
        minOrderAmount: z.number().int().nonnegative().optional(),
        maxUses: z.number().int().positive().nullable().optional(),
        isActive: z.boolean().optional(),
        expiresAt: z.string().nullable().optional().transform((v) => {
          if (v === null) return null;
          if (!v) return undefined;
          const d = new Date(v);
          if (isNaN(d.getTime())) throw new Error("Invalid expiry date");
          return d.toISOString();
        })
      })
      .parse(request.body);

    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) return reply.notFound("Coupon not found");

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...body,
        expiresAt: body.expiresAt === null ? null : body.expiresAt ? new Date(body.expiresAt) : undefined
      }
    });
    return { coupon: updated };
  });

  app.delete("/admin/coupons/:id", adminGuard, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) return reply.notFound("Coupon not found");
    await prisma.coupon.delete({ where: { id } });
    await prisma.adminLog.create({
      data: {
        adminId: request.authUser!.id,
        action: "DELETE_COUPON",
        entity: "Coupon",
        entityId: id,
        meta: { code: coupon.code }
      }
    });
    return { success: true };
  });

  // ─── Admin logs ───────────────────────────────────────────────────────
  app.get("/admin/logs", managerGuard, async (request) => {
    const query = z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(50),
        entity: z.string().optional(),
        action: z.string().optional()
      })
      .parse(request.query);

    const where: Prisma.AdminLogWhereInput = {
      entity: query.entity,
      action: query.action ? { contains: query.action, mode: "insensitive" } : undefined
    };

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        include: { admin: { select: { name: true, email: true, role: true } } },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit
      }),
      prisma.adminLog.count({ where })
    ]);

    return { logs, total, page: query.page };
  });

  // ─── Revenue chart (last 30 days) ─────────────────────────────────────
  app.get("/admin/stats/revenue-chart", managerGuard, async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] }
      },
      select: { createdAt: true, total: true }
    });

    const dailyRevenue: Record<string, number> = {};
    const dailyOrders: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyRevenue[key] = 0;
      dailyOrders[key] = 0;
    }
    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      if (key in dailyRevenue) {
        dailyRevenue[key] = (dailyRevenue[key] ?? 0) + order.total;
        dailyOrders[key] = (dailyOrders[key] ?? 0) + 1;
      }
    }

    return {
      chart: Object.entries(dailyRevenue).map(([date, revenue]) => ({
        date,
        revenue,
        orders: dailyOrders[date]
      }))
    };
  });
}
