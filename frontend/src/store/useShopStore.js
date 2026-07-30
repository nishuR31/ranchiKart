import { create } from "zustand";
import api, { extractError } from "../lib/api";

// NOTE: The backend does NOT have a /cart endpoint.
// Cart is managed client-side in localStorage; orders are placed via /orders.
// Wishlist lives at /wishlist (backend-persisted).

const CART_KEY = "rk_cart";

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || { items: [], subtotal: 0, count: 0 };
  } catch {
    return { items: [], subtotal: 0, count: 0 };
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function recalcCart(items) {
  const subtotal = items.reduce((sum, i) => sum + i.basePrice * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  return { items, subtotal, count };
}

const useShopStore = create((set, get) => ({
  cart: loadCart(),
  wishlist: { items: [] },
  toast: null,
  darkMode: localStorage.getItem("rk_dark") === "true",

  showToast: (message, type = "success") => {
    set({ toast: { message, type, id: Date.now() } });
    setTimeout(
      () => set((s) => (s.toast?.message === message ? { toast: null } : {})),
      2500
    );
  },

  toggleDarkMode: () => {
    const next = !get().darkMode;
    localStorage.setItem("rk_dark", String(next));
    set({ darkMode: next });
  },

  // ─── Cart (client-side, localStorage) ────────────────────────────────────
  fetchCart: () => {
    // No backend /cart — just reload from localStorage
    set({ cart: loadCart() });
  },

  addToCart: (product, quantity = 1) => {
    // product = { id, name, slug, imageUrl, basePrice, stock }
    const items = [...get().cart.items];
    const idx = items.findIndex((i) => i.id === product.id);
    if (idx >= 0) {
      items[idx] = {
        ...items[idx],
        quantity: Math.min(items[idx].quantity + quantity, product.stock ?? 50),
      };
    } else {
      items.push({ ...product, quantity });
    }
    const cart = recalcCart(items);
    saveCart(cart);
    set({ cart });
    get().showToast("Added to cart");
  },

  updateCartItem: (productId, quantity) => {
    const items = get().cart.items.map((i) =>
      i.id === productId ? { ...i, quantity: Math.max(1, quantity) } : i
    );
    const cart = recalcCart(items);
    saveCart(cart);
    set({ cart });
  },

  removeCartItem: (productId) => {
    const items = get().cart.items.filter((i) => i.id !== productId);
    const cart = recalcCart(items);
    saveCart(cart);
    set({ cart });
    get().showToast("Removed from cart");
  },

  clearCart: () => {
    const cart = { items: [], subtotal: 0, count: 0 };
    saveCart(cart);
    set({ cart });
  },

  // ─── Wishlist (backend-persisted at /wishlist) ────────────────────────────
  fetchWishlist: async () => {
    try {
      const { data } = await api.get("/wishlist");
      // data = { items: [{id, product: {...}}] }
      set({ wishlist: data });
    } catch {
      // not logged in — ignore
    }
  },

  toggleWishlist: async (productId) => {
    try {
      const { data } = await api.post("/wishlist/toggle", { productId });
      // data = { inWishlist: bool, productId }
      await get().fetchWishlist();
      get().showToast(data.inWishlist ? "Added to wishlist" : "Removed from wishlist");
      return data.inWishlist;
    } catch (err) {
      get().showToast(extractError(err, "Could not update wishlist"), "error");
      throw err;
    }
  },
}));

export default useShopStore;
