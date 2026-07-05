import { prisma } from "../config/prisma.js";
import CouponRepository from "../repositories/couponRepository.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../utils/errors.js";

const couponRepo = new CouponRepository();

type ApplyCouponData = {
  code: string;
  orderAmount: number;
  categoryId?: string;
};

type CreateCouponData = {
  code: string;
  description?: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrderAmount?: number;
  maxUses?: number;
  expiresAt?: string;
};

export default class CouponService {
  async applyCoupon(data: ApplyCouponData) {
    const coupon = (await couponRepo.findByCode(data.code.toUpperCase())) as any;

    if (!coupon || !coupon.isActive) throw new BadRequestError("Invalid or expired coupon code");
    if (coupon.expiresAt && coupon.expiresAt < new Date())
      throw new BadRequestError("This coupon has expired");
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
      throw new BadRequestError("This coupon has reached its usage limit");

    if (coupon.categoryId && coupon.categoryId !== data.categoryId) {
      const catName = coupon.category?.name ?? "a specific category";
      throw new BadRequestError(`This coupon is only valid for ${catName} products`);
    }

    if (data.orderAmount < coupon.minOrderAmount) {
      const minAmount = (coupon.minOrderAmount / 100).toFixed(0);
      throw new BadRequestError(`Minimum order amount of ₹${minAmount} required for this coupon`);
    }

    let discountAmount = 0;
    if (coupon.type === "PERCENT") {
      discountAmount = Math.round((data.orderAmount * coupon.value) / 100);
    } else {
      discountAmount = Math.min(coupon.value, data.orderAmount);
    }

    return {
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        category: coupon.category,
      },
      discountAmount,
      finalAmount: data.orderAmount - discountAmount,
    };
  }

  async getAllCoupons(userRole: string) {
    if (userRole !== "ADMIN") throw new ForbiddenError("Admin access required");
    return couponRepo.findAll({ orderBy: { createdAt: "desc" } });
  }

  async createCoupon(userRole: string, data: CreateCouponData) {
    if (userRole !== "ADMIN") throw new ForbiddenError("Admin access required");
    return couponRepo.create({
      ...data,
      code: data.code.toUpperCase(),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });
  }

  async toggleCoupon(userRole: string, id: string) {
    if (userRole !== "ADMIN") throw new ForbiddenError("Admin access required");
    const coupon = await couponRepo.findById(id);
    if (!coupon) throw new NotFoundError("Coupon not found");
    return couponRepo.toggleActive(id);
  }
}
