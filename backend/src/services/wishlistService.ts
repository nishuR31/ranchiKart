import WishlistRepository from "../repositories/wishlistRepository.js";
import ProductRepository from "../repositories/productRepository.js";
import { NotFoundError } from "../utils/errors.js";

const wishlistRepo = new WishlistRepository();
const productRepo = new ProductRepository();

export default class WishlistService {
  async getItems(userId: string) {
    return wishlistRepo.findAllByUser(userId);
  }

  async toggle(userId: string, productId: string): Promise<{ wishlisted: boolean }> {
    const existing = await wishlistRepo.findByUserAndProduct(userId, productId);
    if (existing) {
      await wishlistRepo.delete(existing.id);
      return { wishlisted: false };
    }
    const product = await productRepo.findById(productId);
    if (!product) throw new NotFoundError("Product not found");
    await wishlistRepo.create({ userId, productId });
    return { wishlisted: true };
  }

  async add(userId: string, productId: string) {
    const product = await productRepo.findById(productId);
    if (!product) throw new NotFoundError("Product not found");
    return wishlistRepo.upsert(userId, productId);
  }

  async remove(userId: string, productId: string): Promise<void> {
    const removed = await wishlistRepo.deleteByUserAndProduct(userId, productId);
    if (!removed) throw new NotFoundError("Item not in wishlist");
  }

  async check(userId: string, productId: string): Promise<{ wishlisted: boolean }> {
    const item = await wishlistRepo.findByUserAndProduct(userId, productId);
    return { wishlisted: !!item };
  }
}
