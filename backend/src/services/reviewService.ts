import { prisma } from "../config/prisma.js";
import ReviewRepository from "../repositories/reviewRepository.js";
import ProductRepository from "../repositories/productRepository.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../utils/errors.js";

const reviewRepo = new ReviewRepository();
const productRepo = new ProductRepository();

export default class ReviewService {
  async getReviews(slug: string, options: { page: number; limit: number }) {
    const product = await productRepo.findBySlug(slug);
    if (!product) throw new NotFoundError("Product not found");

    const { reviews, total } = await reviewRepo.findManyByProduct(product.id, options);
    const breakdown = await reviewRepo.getRatingBreakdown(product.id);
    const ratingBreakdown = [5, 4, 3, 2, 1].map((r) => ({
      rating: r,
      count: breakdown.find((b) => b.rating === r)?._count.rating ?? 0,
    }));

    return { reviews, total, ...options, ratingBreakdown };
  }

  async createReview(
    slug: string,
    userId: string,
    data: { rating: number; title?: string; body: string },
  ) {
    const product = await productRepo.findBySlug(slug);
    if (!product) throw new NotFoundError("Product not found");

    const existing = await reviewRepo.findByProductAndUser(product.id, userId);
    if (existing) throw new ConflictError("You have already reviewed this product");

    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId: product.id,
        order: { userId, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
      },
    });

    const review = await reviewRepo.create({
      productId: product.id,
      userId,
      rating: data.rating,
      title: data.title,
      body: data.body,
      isVerified: !!hasPurchased,
    });

    const agg = await reviewRepo.getAggregateRating(product.id);
    await productRepo.updateRating(
      product.id,
      Math.round((agg._avg.rating ?? 0) * 10) / 10,
      agg._count.rating,
    );

    return review;
  }

  async markHelpful(id: string) {
    const review = await reviewRepo.findById(id);
    if (!review) throw new NotFoundError("Review not found");
    return reviewRepo.incrementHelpful(id);
  }

  async deleteReview(id: string, userId: string, userRole: string) {
    const review = await reviewRepo.findById(id);
    if (!review) throw new NotFoundError("Review not found");
    if (review.userId !== userId && userRole !== "ADMIN") {
      throw new ForbiddenError("You can only delete your own reviews");
    }

    await reviewRepo.delete(id);

    const agg = await reviewRepo.getAggregateRating(review.productId);
    await productRepo.updateRating(
      review.productId,
      Math.round((agg._avg.rating ?? 4.3) * 10) / 10,
      agg._count.rating,
    );
  }
}
