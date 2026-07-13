import { OrderStatus, type Prisma, ProductKind } from "../../prisma/generated/client/index.js";
import { prisma } from "../config/prisma.js";
import { sendOrderStatusUpdate } from "../config/email.js";
import { NotFoundError, BadRequestError } from "../utils/errors.js";
import { Role } from "../types/index.js";

type PaginationOptions = {
  page: number;
  limit: number;
};

export default class AdminService {
  async getDashboardStats() {
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
      rawRevenueChart,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.user.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.aggregate({
        where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.order.count({
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          items: { include: { product: { select: { name: true, imageUrl: true } } } },
        },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: "desc" } },
        take: 5,
      }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
        },
        select: { createdAt: true, total: true },
      }),
    ]);

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
      revenue,
    }));

    const topProductDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, imageUrl: true, slug: true },
        });
        return { ...item, product };
      }),
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
            : Math.round(((monthlyOrders - lastMonthOrders) / lastMonthOrders) * 100),
      },
      recentOrders,
      topProducts: topProductDetails,
      statusBreakdown,
      revenueChart,
    };
  }

  async getOrders(
    options: PaginationOptions & {
      status?: OrderStatus;
      search?: string;
      from?: string;
      to?: string;
    },
  ) {
    const where: Prisma.OrderWhereInput = {
      status: options.status,
      createdAt: {
        gte: options.from ? new Date(options.from) : undefined,
        lte: options.to ? new Date(options.to) : undefined,
      },
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { include: { product: { select: { name: true, imageUrl: true } } } },
          coupon: { select: { code: true } },
        },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.order.count({ where }),
    ]);

    return { orders, total, page: options.page, limit: options.limit };
  }

  async updateOrderStatus(
    adminId: string,
    orderId: string,
    data: { status: OrderStatus; trackingId?: string; notes?: string },
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) throw new NotFoundError("Order not found");

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: data.status,
        ...(data.trackingId ? { trackingId: data.trackingId } : {}),
        ...(data.notes ? { notes: data.notes } : {}),
      },
    });

    const COINS_PER_DELIVERY = 10;
    const MIN_ORDER_FOR_COINS = 100_000;
    const eligibleForCoins =
      data.status === "DELIVERED" &&
      order.status !== "DELIVERED" &&
      order.total >= MIN_ORDER_FOR_COINS;

    if (eligibleForCoins) {
      await prisma.user.update({
        where: { id: order.userId },
        data: { coins: { increment: COINS_PER_DELIVERY } },
      });
      await prisma.adminLog.create({
        data: {
          adminId,
          action: "AWARD_COINS",
          entity: "User",
          entityId: order.userId,
          meta: {
            coins: COINS_PER_DELIVERY,
            orderTotal: order.total,
            reason: `Order ${orderId} delivered`,
          },
        },
      });
    }

    await prisma.adminLog.create({
      data: {
        adminId,
        action: "UPDATE_ORDER_STATUS",
        entity: "Order",
        entityId: orderId,
        meta: { newStatus: data.status, oldStatus: order.status, trackingId: data.trackingId },
      },
    });

    sendOrderStatusUpdate(
      order.user.email,
      order.user.name ?? "User",
      order.id,
      data.status,
      data.trackingId,
    ).catch(console.error);

    return {
      order: updated,
      coinsAwarded: eligibleForCoins ? COINS_PER_DELIVERY : 0,
    };
  }

  async getProducts(
    options: PaginationOptions & { search?: string; isActive?: boolean; kind?: ProductKind },
  ) {
    const where: Prisma.ProductWhereInput = {
      isActive: options.isActive,
      kind: options.kind,
      name: options.search ? { contains: options.search, mode: "insensitive" } : undefined,
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, _count: { select: { orderItems: true, reviews: true } } },
        orderBy: { createdAt: "desc" },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.product.count({ where }),
    ]);

    return { products, total, page: options.page, limit: options.limit };
  }

  async createProduct(adminId: string, data: any) {
    const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
    if (existing) throw new BadRequestError("Product slug already exists");

    const product = await prisma.product.create({ data: { ...data, currency: "INR" } });

    await prisma.adminLog.create({
      data: {
        adminId,
        action: "CREATE_PRODUCT",
        entity: "Product",
        entityId: product.id,
        meta: { name: product.name, slug: product.slug },
      },
    });

    return product;
  }

  async toggleProduct(adminId: string, id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError("Product not found");
    const updated = await prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
    });
    await prisma.adminLog.create({
      data: {
        adminId,
        action: updated.isActive ? "ACTIVATE_PRODUCT" : "DEACTIVATE_PRODUCT",
        entity: "Product",
        entityId: id,
      },
    });
    return updated;
  }

  async featureProduct(adminId: string, id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError("Product not found");
    const updated = await prisma.product.update({
      where: { id },
      data: { isFeatured: !product.isFeatured },
    });
    await prisma.adminLog.create({
      data: {
        adminId,
        action: updated.isFeatured ? "FEATURE_PRODUCT" : "UNFEATURE_PRODUCT",
        entity: "Product",
        entityId: id,
      },
    });
    return updated;
  }

  async updateProduct(adminId: string, id: string, data: any) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError("Product not found");

    const updated = await prisma.product.update({ where: { id }, data });
    await prisma.adminLog.create({
      data: {
        adminId,
        action: "UPDATE_PRODUCT",
        entity: "Product",
        entityId: id,
        meta: data,
      },
    });
    return updated;
  }

  async getUsers(options: PaginationOptions & { search?: string; role?: keyof Role }) {
    const where: Prisma.UserWhereInput = {
      role: options.role,
      OR: options.search
        ? [
          { name: { contains: options.search, mode: "insensitive" } },
          { email: { contains: options.search, mode: "insensitive" } },
        ]
        : undefined,
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
          coins: true,
          createdAt: true,
          _count: { select: { orders: true, reviews: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page: options.page, limit: options.limit };
  }

  async banUser(adminId: string, id: string, data: { isBanned: boolean; banReason?: string }) {
    if (id === adminId) throw new BadRequestError("Cannot ban yourself");
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError("User not found");

    const updated = await prisma.user.update({
      where: { id },
      data: { isBanned: data.isBanned, banReason: data.isBanned ? (data.banReason ?? null) : null },
      select: { id: true, email: true, name: true, role: true, isBanned: true, banReason: true },
    });

    await prisma.adminLog.create({
      data: {
        adminId,
        action: data.isBanned ? "BAN_USER" : "UNBAN_USER",
        entity: "User",
        entityId: id,
        meta: { reason: data.banReason, targetEmail: user.email },
      },
    });
    return updated;
  }

  async updateUserRole(adminId: string, id: string, data: { role: keyof Role }) {
    if (id === adminId) throw new BadRequestError("Cannot change your own role");
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError("User not found");

    const updated = await prisma.user.update({
      where: { id },
      data: { role: data.role },
      select: { id: true, email: true, name: true, role: true },
    });

    await prisma.adminLog.create({
      data: {
        adminId,
        action: "UPDATE_USER_ROLE",
        entity: "User",
        entityId: id,
        meta: { oldRole: user.role, newRole: data.role },
      },
    });
    return updated;
  }

  async getCoupons(options: PaginationOptions & { isActive?: boolean }) {
    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where: { isActive: options.isActive },
        orderBy: { createdAt: "desc" },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        include: {
          _count: { select: { orders: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.coupon.count({ where: { isActive: options.isActive } }),
    ]);

    return { coupons, total, page: options.page };
  }

  async createCoupon(adminId: string, data: any) {
    const existing = await prisma.coupon.findUnique({ where: { code: data.code } });
    if (existing) throw new BadRequestError("Coupon code already exists");

    const coupon = await prisma.coupon.create({
      data: {
        ...data,
        categoryId: data.categoryId || undefined,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    await prisma.adminLog.create({
      data: {
        adminId,
        action: "CREATE_COUPON",
        entity: "Coupon",
        entityId: coupon.id,
        meta: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          categoryId: data.categoryId,
        },
      },
    });
    return coupon;
  }

  async updateCoupon(id: string, data: any) {
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundError("Coupon not found");
    return prisma.coupon.update({ where: { id }, data });
  }

  async deleteCoupon(adminId: string, id: string) {
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundError("Coupon not found");
    await prisma.coupon.delete({ where: { id } });
    await prisma.adminLog.create({
      data: {
        adminId,
        action: "DELETE_COUPON",
        entity: "Coupon",
        entityId: id,
        meta: { code: coupon.code },
      },
    });
  }

  async getLogs(options: PaginationOptions & { entity?: string; action?: string }) {
    const where: Prisma.AdminLogWhereInput = {
      entity: options.entity,
      action: options.action ? { contains: options.action, mode: "insensitive" } : undefined,
    };

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        include: { admin: { select: { name: true, email: true, role: true } } },
        orderBy: { createdAt: "desc" },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.adminLog.count({ where }),
    ]);

    return { logs, total, page: options.page };
  }

  async getRevenueChart() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
      },
      select: { createdAt: true, total: true },
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
        orders: dailyOrders[date],
      })),
    };
  }

  async createCategory(adminId: string, data: any) {
    const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
    if (existing) throw new BadRequestError("Category slug already exists");

    const category = await prisma.category.create({ data });

    await prisma.adminLog.create({
      data: {
        adminId,
        action: "CREATE_CATEGORY",
        entity: "Category",
        entityId: category.id,
        meta: { name: category.name, slug: category.slug },
      },
    });

    return category;
  }

  async updateCategory(adminId: string, id: string, data: any) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundError("Category not found");

    if (data.slug && data.slug !== category.slug) {
      const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
      if (existing) throw new BadRequestError("Category slug already exists");
    }

    const updated = await prisma.category.update({ where: { id }, data });
    
    await prisma.adminLog.create({
      data: {
        adminId,
        action: "UPDATE_CATEGORY",
        entity: "Category",
        entityId: id,
        meta: data,
      },
    });

    return updated;
  }

  async deleteCategory(adminId: string, id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!category) throw new NotFoundError("Category not found");

    if (category._count.products > 0) {
      throw new BadRequestError(`Cannot delete category with ${category._count.products} products attached.`);
    }
    if (category._count.children > 0) {
      throw new BadRequestError(`Cannot delete category with ${category._count.children} child categories.`);
    }

    await prisma.category.delete({ where: { id } });

    await prisma.adminLog.create({
      data: {
        adminId,
        action: "DELETE_CATEGORY",
        entity: "Category",
        entityId: id,
        meta: { name: category.name, slug: category.slug },
      },
    });
  }
}
