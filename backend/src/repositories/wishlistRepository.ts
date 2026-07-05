import BaseRepository from "./baseRepository.js";
import { prisma } from "../config/prisma.js";

export default class WishlistRepository extends BaseRepository {
  constructor() {
    super("wishlist");
  }

  async findByUserAndProduct(userId: string, productId: string) {
    return this.findOne({ userId, productId });
  }

  async findAllByUser(userId: string) {
    return prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: { category: true, variants: { orderBy: { priceDelta: "asc" } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async upsert(userId: string, productId: string) {
    return prisma.wishlist.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
      include: { product: true },
    });
  }

  async deleteByUserAndProduct(userId: string, productId: string): Promise<boolean> {
    const item = await this.findByUserAndProduct(userId, productId);
    if (!item) return false;
    await this.delete(item.id);
    return true;
  }
}
