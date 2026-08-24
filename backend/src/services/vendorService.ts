import { prisma } from "../config/prisma.js";
import { NotFoundError, BadRequestError } from "../utils/errors.js";
import type { Prisma } from "../../prisma/generated/client/index.js";

export default class VendorService {
  async registerStore(userId: string, data: { name: string; description?: string; logoUrl?: string; bannerUrl?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("User not found");

    const slug = data.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    
    const existingStoreByOwner = await prisma.store.findUnique({ where: { ownerId: userId } });
    if (existingStoreByOwner) {
      throw new BadRequestError("User already has a registered store");
    }

    const existingStore = await prisma.store.findUnique({ where: { slug } });
    
    if (existingStore) {
      throw new BadRequestError("Store name already exists");
    }

    const store = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create store
      const newStore = await tx.store.create({
        data: {
          ...data,
          slug,
          ownerId: userId
        }
      });
      // Upgrade user role if not already SELLER or ADMIN
      if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
        await tx.user.update({
          where: { id: userId },
          data: { role: 'SELLER' }
        });
      }
      return newStore;
    });

    return store;
  }

  async getStoreByUserId(userId: string) {
    const store = await prisma.store.findUnique({
      where: { ownerId: userId },
      include: {
        products: {
          where: { isActive: true }
        }
      }
    });
    if (!store) throw new NotFoundError("Store not found");
    return store;
  }

  async updateStore(userId: string, data: any) {
    const store = await prisma.store.findUnique({ where: { ownerId: userId } });
    if (!store) throw new NotFoundError("Store not found");

    const updatedStore = await prisma.store.update({
      where: { id: store.id },
      data
    });
    return updatedStore;
  }

  async createProduct(storeId: string, data: any) {
    return prisma.product.create({
      data: {
        ...data,
        storeId
      }
    });
  }

  async updateProduct(storeId: string, productId: string, data: any) {
    const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!product) throw new NotFoundError("Product not found or doesn't belong to your store");

    return prisma.product.update({
      where: { id: productId },
      data
    });
  }

  async deleteProduct(storeId: string, productId: string) {
    const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!product) throw new NotFoundError("Product not found or doesn't belong to your store");

    return prisma.product.delete({
      where: { id: productId }
    });
  }

  async getStoreOrders(storeId: string, options: { status?: any; page: number; limit: number }) {
    const where = { storeId, ...(options.status ? { status: options.status } : {}) };
    const [total, data] = await Promise.all([
      prisma.storeOrder.count({ where }),
      prisma.storeOrder.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { product: true, variant: true } } }
      })
    ]);
    
    return { data, total, page: options.page, limit: options.limit };
  }

  async updateStoreOrderStatus(storeId: string, orderId: string, status: any, trackingId?: string) {
    const order = await prisma.storeOrder.findFirst({ where: { id: orderId, storeId } });
    if (!order) throw new NotFoundError("Order not found or doesn't belong to your store");

    return prisma.storeOrder.update({
      where: { id: orderId },
      data: {
        status,
        ...(trackingId ? { trackingId } : {})
      }
    });
  }
}
