import { Product } from "../../prisma/generated/client/index.js";
import BaseRepository from "./baseRepository.js";
import { prisma } from "../config/prisma.js";

export default class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super("product");
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return this.findOne({ slug });
  }

  async findWithVariants(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });
  }

  async findWithDetails(slug: string) {
    return prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        variants: { orderBy: { priceDelta: "asc" } },
        reviews: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
  }

  async updateRating(productId: string, rating: number, reviewCount: number): Promise<Product> {
    return this.update(productId, { rating, reviewCount });
  }
}
