export type ProductKind = "STAMP" | "STATIONERY" | "BOARD";
export type PaymentMethod = "UPI" | "CARD" | "NET_BANKING";

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  kind: ProductKind;
  parentId: string | null;
  children?: Category[];
};

export type ProductVariant = {
  id: string;
  productId: string;
  name: string;
  sku: string;
  priceDelta: number;
  attributes: Record<string, unknown>;
  stock: number;
};

export type Product = {
  id: string;
  categoryId: string;
  category: Category;
  slug: string;
  name: string;
  description: string;
  kind: ProductKind;
  imageUrl: string;
  gallery: string[];
  basePrice: number;
  currency: string;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  highlights: string[];
  specifications: Record<string, string>;
  rating: number;
  reviewCount: number;
  replacementDays: number;
  returnEligible: boolean;
  warrantyText: string;
  dispatchDays: number;
  minWidthMm: number | null;
  maxWidthMm: number | null;
  minHeightMm: number | null;
  maxHeightMm: number | null;
  defaultWidthMm: number | null;
  defaultHeightMm: number | null;
  options: Record<string, unknown>;
  variants: ProductVariant[];
  createdAt?: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: "USER" | "MANAGER" | "ADMIN";
  avatarUrl?: string | null;
  phone?: string | null;
  isEmailVerified?: boolean;
};

export type CartItem = {
  id: string;
  product: Product;
  variant?: ProductVariant;
  quantity: number;
  customWidthMm?: number;
  customHeightMm?: number;
  customText?: string;
  customization: Record<string, unknown>;
};

export type Address = {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
};

export type Order = {
  id: string;
  status: string;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  total: number;
  trackingId?: string;
};

export type PaymentGatewayOrder = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  mock: boolean;
};

export type Review = {
  id: string;
  productId: string;
  userId: string;
  user: { id: string; name: string; avatarUrl: string | null };
  rating: number;
  title?: string;
  body: string;
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
};

export type Coupon = {
  id: string;
  code: string;
  description?: string;
  type: "PERCENT" | "FIXED";
  value: number;
};
