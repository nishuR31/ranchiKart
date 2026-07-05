const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(err.message ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

export const api = {
  // ── Auth ────────────────────────────────────────────────────────────────
  register: (body: { email: string; name: string; password: string }) =>
    request<{ token: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body)
    }),

  getMe: (token: string) => request<{ user: any }>("/auth/me", { token }),

  // ── Catalog ─────────────────────────────────────────────────────────────
  getCategories: () => request<{ categories: any[] }>("/categories"),

  getProducts: (
    params: {
      category?: string;
      q?: string;
      kind?: string;
      minPrice?: number;
      maxPrice?: number;
      minRating?: number;
      featured?: boolean;
      sort?: string;
      page?: number;
      limit?: number;
    } = {}
  ) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) qs.set(k, String(v));
    });
    return request<{ products: any[]; total: number; page: number; totalPages: number }>(
      `/products?${qs}`
    );
  },

  getProduct: (slug: string) =>
    request<{ product: any; related: any[] }>(`/products/${slug}`),

  getFeaturedProducts: () =>
    request<{ products: any[] }>("/products/featured"),

  searchProducts: (q: string) =>
    request<{ products: any[] }>(`/search?q=${encodeURIComponent(q)}`),

  // ── Reviews ─────────────────────────────────────────────────────────────
  getReviews: (slug: string, page = 1) =>
    request<{ reviews: any[]; total: number; ratingBreakdown: any[] }>(
      `/products/${slug}/reviews?page=${page}`
    ),

  createReview: (
    slug: string,
    body: { rating: number; title?: string; body: string },
    token: string
  ) =>
    request<{ review: any }>(`/products/${slug}/reviews`, {
      method: "POST",
      body: JSON.stringify(body),
      token
    }),

  // ── Wishlist ─────────────────────────────────────────────────────────────
  getWishlist: (token: string) =>
    request<{ items: any[] }>("/wishlist", { token }),

  toggleWishlist: (productId: string, token: string) =>
    request<{ wishlisted: boolean }>("/wishlist/toggle", {
      method: "POST",
      body: JSON.stringify({ productId }),
      token
    }),

  // ── Coupons ──────────────────────────────────────────────────────────────
  applyCoupon: (code: string, orderAmount: number, token: string) =>
    request<{ discountAmount: number; finalAmount: number; coupon: any }>("/coupons/apply", {
      method: "POST",
      body: JSON.stringify({ code, orderAmount }),
      token
    }),

  // ── Orders ───────────────────────────────────────────────────────────────
  createOrder: (body: any, token: string) =>
    request<{ order: any }>("/orders", {
      method: "POST",
      body: JSON.stringify(body),
      token
    }),

  getOrder: (id: string, token: string) =>
    request<{ order: any }>(`/orders/${id}`, { token }),

  getMyOrders: (token: string, status?: string, page = 1) => {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set("status", status);
    return request<{ orders: any[]; total: number }>(`/orders?${qs}`, { token });
  },

  // ── Payments ─────────────────────────────────────────────────────────────
  createRazorpayOrder: (orderId: string, token: string) =>
    request<{ payment: any; gateway: any }>("/payments/razorpay/orders", {
      method: "POST",
      body: JSON.stringify({ orderId }),
      token
    }),

  verifyRazorpayPayment: (body: any, token: string) =>
    request<{ payment: any }>("/payments/razorpay/verify", {
      method: "POST",
      body: JSON.stringify(body),
      token
    }),

  // ── User Profile ──────────────────────────────────────────────────────────
  getUserProfile: (token: string) =>
    request<{ user: any }>("/users/me", { token }),

  updateProfile: (body: any, token: string) =>
    request<{ user: any }>("/users/me/profile", {
      method: "PUT",
      body: JSON.stringify(body),
      token
    }),

  getSavedAddresses: (token: string) =>
    request<{ addresses: any[] }>("/users/me/addresses", { token }),

  saveAddress: (body: any, token: string) =>
    request<{ address: any }>("/users/me/addresses", {
      method: "POST",
      body: JSON.stringify(body),
      token
    }),

  // ── Admin ─────────────────────────────────────────────────────────────────
  getAdminDashboard: (token: string) =>
    request<any>("/admin/dashboard", { token }),

  getAdminOrders: (token: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params);
    return request<{ orders: any[]; total: number }>(`/admin/orders?${qs}`, { token });
  },

  updateOrderStatus: (
    id: string,
    body: { status: string; trackingId?: string; notes?: string },
    token: string
  ) =>
    request<{ order: any }>(`/admin/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(body),
      token
    }),

  getAdminProducts: (token: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params);
    return request<{ products: any[]; total: number }>(`/admin/products?${qs}`, { token });
  },

  toggleProductActive: (id: string, token: string) =>
    request<{ product: any }>(`/admin/products/${id}/toggle`, {
      method: "PATCH",
      body: JSON.stringify({}),
      token
    }),

  toggleProductFeatured: (id: string, token: string) =>
    request<{ product: any }>(`/admin/products/${id}/featured`, {
      method: "PATCH",
      body: JSON.stringify({}),
      token
    }),

  getAdminUsers: (token: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params);
    return request<{ users: any[]; total: number }>(`/admin/users?${qs}`, { token });
  },

  updateUserRole: (id: string, role: string, token: string) =>
    request<{ user: any }>(`/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
      token
    }),

  getAdminCoupons: (token: string) =>
    request<{ coupons: any[]; total: number }>("/admin/coupons", { token }),

  createAdminCoupon: (body: any, token: string) =>
    request<{ coupon: any }>("/admin/coupons", {
      method: "POST",
      body: JSON.stringify(body),
      token
    }),

  updateAdminCoupon: (id: string, body: any, token: string) =>
    request<{ coupon: any }>(`/admin/coupons/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
      token
    }),

  deleteAdminCoupon: (id: string, token: string) =>
    request<{ success: boolean }>(`/admin/coupons/${id}`, {
      method: "DELETE",
      token
    }),

  getAdminLogs: (token: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params);
    return request<{ logs: any[]; total: number; page: number }>(`/admin/logs?${qs}`, { token });
  },

  banUser: (id: string, body: { isBanned: boolean; banReason?: string }, token: string) =>
    request<{ user: any }>(`/admin/users/${id}/ban`, {
      method: "PATCH",
      body: JSON.stringify(body),
      token
    }),

  createAdminProduct: (body: any, token: string) =>
    request<{ product: any }>("/admin/products", {
      method: "POST",
      body: JSON.stringify(body),
      token
    }),

  updateAdminProduct: (id: string, body: any, token: string) =>
    request<{ product: any }>(`/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
      token
    }),

  getRevenueChart: (token: string) =>
    request<{ chart: any[] }>("/admin/stats/revenue-chart", { token })
};
