import { prisma } from "../config/prisma.js";
import UserRepository from "../repositories/userRepository.js";
import { NotFoundError } from "../utils/errors.js";

const userRepo = new UserRepository();

type UpdateProfileData = {
  name?: string;
  phone?: string;
  avatarUrl?: string;
};

type CreateAddressData = {
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
};

export default class UserService {
  async getProfile(userId: string) {
    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        phone: true,
        isEmailVerified: true,
        coins: true,
        createdAt: true,
        _count: { select: { orders: true, reviews: true, wishlist: true } },
      },
    });
  }

  async updateProfile(userId: string, data: UpdateProfileData) {
    return userRepo.updateProfile(userId, data);
  }

  async getAddresses(userId: string) {
    return prisma.savedAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  async addAddress(userId: string, data: CreateAddressData) {
    if (data.isDefault) {
      await prisma.savedAddress.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return prisma.savedAddress.create({ data: { ...data, userId } });
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const address = await prisma.savedAddress.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new NotFoundError("Address not found");
    await prisma.savedAddress.delete({ where: { id: addressId } });
  }

  async softDeleteAccount(userId: string) {
    const now = new Date();
    const purgeDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

    return prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
        deletedAt: now,
        scheduledHardDeleteAt: purgeDate,
        refreshToken: null,
      },
    });
  }

  static async purgeExpiredSoftDeletedUsers(): Promise<number> {
    const now = new Date();
    const expiredUsers = await prisma.user.findMany({
      where: {
        isDeleted: true,
        scheduledHardDeleteAt: { lte: now },
      },
      select: { id: true },
    });

    if (expiredUsers.length === 0) return 0;
    const userIds = expiredUsers.map((u) => u.id);

    const result = await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });

    return result.count;
  }
}
