import { Coupon } from "@prisma/client";
import BaseRepository from "./baseRepository.js";
import { prisma } from "../config/prisma.js";

export default class CouponRepository extends BaseRepository<Coupon> {
  constructor() {
    super("coupon");
  }

  async findByCode(code: string): Promise<Coupon | null> {
    return prisma.coupon.findUnique({
      where: { code },
      include: { category: { select: { id: true, name: true, slug: true } } },
    }) as any;
  }

  async toggleActive(id: string): Promise<Coupon> {
    const coupon = await this.findById(id);
    return this.update(id, { isActive: !coupon.isActive });
  }

  async incrementUsage(id: string): Promise<Coupon> {
    return this.update(id, { usedCount: { increment: 1 } });
  }
}
