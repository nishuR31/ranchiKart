import { Review } from "@prisma/client";
import BaseRepository from "./baseRepository.js";
import { prisma } from "../config/prisma.js";

export default class ReviewRepository extends BaseRepository<Review> {
  constructor() {
    super("review");
  }

  async findByProductAndUser(productId: string, userId: string): Promise<Review | null> {
    return this.findOne({ productId, userId });
  }

  async findManyByProduct(productId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.review.count({ where: { productId } }),
    ]);
    return { reviews, total };
  }

  async getRatingBreakdown(productId: string) {
    return prisma.review.groupBy({
      by: ["rating"],
      where: { productId },
      _count: { rating: true },
    });
  }

  async getAggregateRating(productId: string) {
    return prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });
  }

  async incrementHelpful(id: string): Promise<Review> {
    return this.update(id, { helpfulCount: { increment: 1 } });
  }
}
