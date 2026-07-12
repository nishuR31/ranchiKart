import type { Product, ProductVariant } from "../../prisma/generated/client/index.js";

export function assertSize(product: Product, width?: number, height?: number) {
  if (!width && !height) return;

  if (!product.minWidthMm || !product.maxWidthMm || !product.minHeightMm || !product.maxHeightMm) {
    throw new Error(`${product.name} does not support custom sizing`);
  }

  if (!width || !height) throw new Error(`${product.name} needs both width and height`);
  if (width < product.minWidthMm || width > product.maxWidthMm)
    throw new Error(`${product.name} width is out of range`);
  if (height < product.minHeightMm || height > product.maxHeightMm)
    throw new Error(`${product.name} height is out of range`);
}

export function sizePrice(product: Product, width?: number, height?: number) {
  if (!width || !height || !product.defaultWidthMm || !product.defaultHeightMm) return 0;
  const defaultArea = product.defaultWidthMm * product.defaultHeightMm;
  const requestedArea = width * height;
  if (requestedArea <= defaultArea) return 0;

  return Math.round(product.basePrice * ((requestedArea - defaultArea) / defaultArea) * 0.45);
}

export function unitPrice(
  product: Product,
  variant?: ProductVariant | null,
  width?: number,
  height?: number,
) {
  return product.basePrice + (variant?.priceDelta ?? 0) + sizePrice(product, width, height);
}
