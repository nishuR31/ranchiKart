import { Order, OrderStatus } from "@prisma/client";
import BaseRepository from "./baseRepository.js";
import { prisma } from "../config/prisma.js";

export default class OrderRepository extends BaseRepository<Order> {
  constructor() {
    super("order");
  }

  async findByIdAndUser(id: string, userId: string) {
    return prisma.order.findFirst({
      where: { id, userId },
      include: {
        items: { include: { product: true, variant: true } },
        payments: true,
        coupon: true,
      },
    });
  }

  async findAllForUser(
    userId: string,
    options: { status?: OrderStatus; page: number; limit: number },
  ) {
    const { status, page, limit } = options;
    const where = { userId, ...(status ? { status } : {}) };
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { items: { include: { product: true, variant: true } }, coupon: true },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);
    return { orders, total };
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return this.update(id, { status });
  }
}
