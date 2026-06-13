import type { Product, ProductVariant } from "../types";

export function optionList(product: Product | null, key: string) {
  const value = product?.options[key];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export function hasSizing(product: Product | null) {
  return Boolean(product?.minWidthMm && product.maxWidthMm && product.minHeightMm && product.maxHeightMm);
}

export function sizeFee(product: Product, width?: number, height?: number) {
  if (!width || !height || !product.defaultWidthMm || !product.defaultHeightMm) return 0;
  const defaultArea = product.defaultWidthMm * product.defaultHeightMm;
  const requestedArea = width * height;
  if (requestedArea <= defaultArea) return 0;
  return Math.round(product.basePrice * ((requestedArea - defaultArea) / defaultArea) * 0.45);
}

export function unitPrice(product: Product, variant?: ProductVariant, width?: number, height?: number) {
  return product.basePrice + (variant?.priceDelta ?? 0) + sizeFee(product, width, height);
}
