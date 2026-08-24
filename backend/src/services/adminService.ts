import { OrderStatus, type Prisma, ProductKind } from "../../prisma/generated/client/index.js";
import { prisma } from "../config/prisma.js";
import { sendOrderStatusUpdate } from "../config/email.js";
import { sendOrderInvoiceEmail } from "./orderService.js";
import { NotFoundError, BadRequestError } from "../utils/errors.js";
import { Role } from "../types/index.js";
import { removeRefreshToken } from "../utils/jwt.js";
import { invalidate } from "../config/cache.js";

type PaginationOptions = {
  page: number;
  limit: number;
};

export default class AdminService {
  private async invalidateCatalogCache() {
    await invalidate("catalog:*");
  }

  private async ensureDeletedProductPlaceholder(tx: Prisma.TransactionClient) {
    const category = await tx.category.upsert({
      where: { slug: "archived-products" },
      update: {},
      create: {
        slug: "archived-products",
        name: "Archived Products",
        description: "Internal placeholder category for products removed from the active catalog.",
        imageUrl: "/assets/source.png",
        kind: ProductKind.OTHER,
      },
    });

    // Ensure a store exists for the placeholder product
    let store = await tx.store.findFirst();
    if (!store) {
      const adminUser = await tx.user.findFirst({ where: { role: "ADMIN" } });
      const ownerId = adminUser?.id ?? (await tx.user.findFirst())?.id;
      if (!ownerId) {
        throw new Error("No owner found for placeholder store");
      }
      store = await tx.store.create({
        data: {
          ownerId: ownerId,
          name: "Placeholder Store",
          slug: "placeholder-store",
          isActive: true,
          isVerified: false,
        },
      });
    }

    return tx.product.upsert({
      where: { slug: "deleted-product-placeholder" },
      update: { isActive: false, categoryId: category.id },
      create: {
        slug: "deleted-product-placeholder",
        name: "Deleted Product",
        description: "This product was removed from the catalog. Order history is preserved for records.",
        kind: ProductKind.OTHER,
        categoryId: category.id,
        storeId: store.id,
        imageUrl: "/assets/source.png",
        gallery: [],
        basePrice: 0,
        currency: "INR",
        stock: 0,
        isActive: false,
        isFeatured: false,
        tags: ["archived"],
        highlights: [],
        specifications: { Brand: "UrbanRanchi" },
      },
    });
  }

  private async deleteProductRecords(tx: Prisma.TransactionClient, productIds: string[], placeholderId: string) {
    const uniqueIds = [...new Set(productIds)].filter((id) => id !== placeholderId);
    if (!uniqueIds.length) return [];

    const products = await tx.product.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true, slug: true },
    });
    if (products.length !== uniqueIds.length) {
      throw new NotFoundError("One or more products were not found");
    }

    await tx.review.deleteMany({ where: { productId: { in: uniqueIds } } });
    await tx.wishlist.deleteMany({ where: { productId: { in: uniqueIds } } });
    await tx.orderItem.updateMany({
      where: { productId: { in: uniqueIds } },
      data: { productId: placeholderId, variantId: null },
    });
    await tx.productVariant.deleteMany({ where: { productId: { in: uniqueIds } } });
    await tx.product.deleteMany({ where: { id: { in: uniqueIds } } });

    return products;
  }

  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const [
      totalOrders,
      totalUsers,
      totalProducts,
      revenueData,
      monthlyOrders,
      lastMonthOrders,
      recentOrders,
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
    ]);

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
      ...(options.from || options.to
        ? {
          createdAt: {
            ...(options.from ? { gte: new Date(options.from) } : {}),
            ...(options.to ? { lte: new Date(options.to) } : {}),
          },
        }
        : {}),
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

    if (data.status === OrderStatus.PAID || data.status === OrderStatus.PROCESSING) {
      sendOrderInvoiceEmail(order.id).catch(console.error);
    }

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

    await this.invalidateCatalogCache();
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
    await this.invalidateCatalogCache();
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
    await this.invalidateCatalogCache();
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
    await this.invalidateCatalogCache();
    return updated;
  }

  async deleteProduct(adminId: string, id: string) {
    const deleted = await prisma.$transaction(async (tx) => {
      const placeholder = await this.ensureDeletedProductPlaceholder(tx);
      const [product] = await this.deleteProductRecords(tx, [id], placeholder.id);

      await tx.adminLog.create({
        data: {
          adminId,
          action: "DELETE_PRODUCT",
          entity: "Product",
          entityId: id,
          meta: { name: product.name, slug: product.slug },
        },
      });

      return product;
    }, { timeout: 15_000 });

    await this.invalidateCatalogCache();
    return { deletedProductId: deleted.id };
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
      data: {
        isBanned: data.isBanned,
        banReason: data.isBanned ? (data.banReason ?? null) : null,
        refreshToken: data.isBanned ? null : undefined,
      },
      select: { id: true, email: true, name: true, role: true, isBanned: true, banReason: true },
    });

    if (data.isBanned) {
      await removeRefreshToken(id);
    }

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
    if (data.type === "PERCENT" && data.value > 100) {
      throw new BadRequestError("Percent coupons cannot be more than 100%.");
    }
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
    const nextType = data.type ?? coupon.type;
    const nextValue = data.value ?? coupon.value;
    if (nextType === "PERCENT" && nextValue > 100) {
      throw new BadRequestError("Percent coupons cannot be more than 100%.");
    }
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

    await this.invalidateCatalogCache();
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

    await this.invalidateCatalogCache();
    return updated;
  }

  async deleteCategory(adminId: string, id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!category) throw new NotFoundError("Category not found");
    if (category.slug === "archived-products") {
      throw new BadRequestError("Archived Products is an internal category and cannot be deleted.");
    }

    await prisma.$transaction(async (tx) => {
      const allCategories = await tx.category.findMany({
        select: { id: true, parentId: true, name: true, slug: true },
      });
      const byParent = new Map<string | null, typeof allCategories>();
      for (const item of allCategories) {
        const key = item.parentId ?? null;
        byParent.set(key, [...(byParent.get(key) ?? []), item]);
      }

      const selected: typeof allCategories = [];
      const visit = (categoryId: string) => {
        const match = allCategories.find((item) => item.id === categoryId);
        if (match) selected.push(match);
        for (const child of byParent.get(categoryId) ?? []) visit(child.id);
      };
      visit(id);

      const categoryIds = selected.map((item) => item.id);
      const products = await tx.product.findMany({
        where: { categoryId: { in: categoryIds } },
        select: { id: true, name: true, slug: true },
      });
      const placeholder = await this.ensureDeletedProductPlaceholder(tx);
      await this.deleteProductRecords(tx, products.map((product) => product.id), placeholder.id);

      await tx.coupon.updateMany({
        where: { categoryId: { in: categoryIds } },
        data: { categoryId: null },
      });

      const depthOf = (node: typeof selected[number]) => {
        let depth = 0;
        let parentId = node.parentId;
        while (parentId) {
          depth += 1;
          parentId = allCategories.find((candidate) => candidate.id === parentId)?.parentId ?? null;
        }
        return depth;
      };

      for (const item of [...selected].sort((a, b) => depthOf(b) - depthOf(a))) {
        await tx.category.delete({ where: { id: item.id } });
      }

      await tx.adminLog.create({
        data: {
          adminId,
          action: "DELETE_CATEGORY_TREE",
          entity: "Category",
          entityId: id,
          meta: {
            name: category.name,
            slug: category.slug,
            deletedCategories: selected.length,
            deletedProducts: products.length,
          },
        },
      });
    }, { timeout: 20_000 });

    await this.invalidateCatalogCache();
  }

  async restoreUserAccount(adminId: string, userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User not found");
    if (!user.isDeleted) throw new BadRequestError("User account is not soft-deleted");

    const restored = await prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: false,
        deletedAt: null,
        scheduledHardDeleteAt: null,
      },
    });

    await prisma.adminLog.create({
      data: {
        adminId,
        action: "RESTORE_USER_ACCOUNT",
        entity: "User",
        entityId: userId,
        meta: { email: user.email },
      },
    });

    return restored;
  }

  async forceDeleteUser(adminId: string, userId: string) {
    if (userId === adminId) throw new BadRequestError("Cannot force delete yourself");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!user) throw new NotFoundError("User not found");

    await prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: { userId },
        select: { id: true },
      });
      const orderIds = orders.map((order) => order.id);

      await tx.review.deleteMany({ where: { userId } });
      await tx.wishlist.deleteMany({ where: { userId } });
      await tx.savedAddress.deleteMany({ where: { userId } });
      await tx.passkeyCredential.deleteMany({ where: { userId } });
      await tx.adminLog.deleteMany({ where: { adminId: userId } });

      if (orderIds.length > 0) {
        await tx.payment.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await tx.review.updateMany({
          where: { orderId: { in: orderIds } },
          data: { orderId: null },
        });
        await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      }

      await tx.adminLog.create({
        data: {
          adminId,
          action: "FORCE_DELETE_USER",
          entity: "User",
          entityId: userId,
          meta: { email: user.email, name: user.name, role: user.role },
        },
      });

      await tx.user.deleteMany({ where: { id: userId } });
    });

    return { deletedUserId: userId };
  }

  async getStores() {
    return prisma.store.findMany({
      include: {
        owner: { select: { name: true, email: true } },
        _count: { select: { products: true, storeOrders: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async verifyStore(storeId: string, isVerified: boolean) {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundError("Store not found");

    return prisma.store.update({
      where: { id: storeId },
      data: { isVerified },
    });
  }

  async deleteStore(adminId: string, storeId: string) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { owner: true }
    });
    if (!store) throw new NotFoundError("Store not found");

    await prisma.$transaction(async (tx) => {
      await tx.storeOrder.deleteMany({ where: { storeId } });
      await tx.product.deleteMany({ where: { storeId } });
      await tx.store.delete({ where: { id: storeId } });

      await tx.adminLog.create({
        data: {
          adminId,
          action: "DELETE_STORE",
          entity: "Store",
          entityId: storeId,
          meta: { storeName: store.name, ownerEmail: store.owner.email },
        }
      });
    });
  }
}
