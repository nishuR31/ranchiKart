import { User } from "@prisma/client";
import BaseRepository from "./baseRepository.js";

export default class UserRepository extends BaseRepository<User> {
  constructor() {
    super("user");
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    return this.update(userId, { passwordHash });
  }

  async updateProfile(
    userId: string,
    data: Partial<Pick<User, "name" | "phone" | "avatarUrl">>,
  ): Promise<User> {
    return this.update(userId, data);
  }

  async banUser(userId: string, banReason?: string): Promise<User> {
    return this.update(userId, { isBanned: true, banReason: banReason ?? "Policy violation" });
  }

  async unbanUser(userId: string): Promise<User> {
    return this.update(userId, { isBanned: false, banReason: null });
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<User> {
    return this.update(userId, { refreshToken });
  }

  async updateLastLogin(userId: string): Promise<User> {
    return this.update(userId, { lastLogin: new Date() });
  }

  async updateTotpSecret(userId: string, secret: string | null, isEnabled: boolean): Promise<User> {
    return this.update(userId, { totpSecret: secret, isTotpEnabled: isEnabled });
  }
}
