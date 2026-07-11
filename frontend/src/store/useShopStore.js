import { create } from "zustand";
import api, { extractError } from "../lib/api";

const useShopStore = create((set, get) => ({
  cart: { items: [], subtotal: 0, count: 0 },
  wishlist: { items: [] },
  toast: null,
  darkMode: localStorage.getItem("rk_dark") === "true",

  showToast: (message, type = "success") => {
    set({ toast: { message, type, id: Date.now() } });
    setTimeout(() => set((s) => (s.toast?.message === message ? { toast: null } : {})), 2500);
  },

  toggleDarkMode: () => {
    const next = !get().darkMode;
    localStorage.setItem("rk_dark", String(next));
    set({ darkMode: next });
  },

  fetchCart: async () => {
    try {
      const { data } = await api.get("/cart");
      set({ cart: data });
    } catch (_err) {
      // not logged in or request failed silently
    }
  },

  addToCart: async (productId, quantity = 1) => {
    try {
      const { data } = await api.post("/cart", { productId, quantity });
      set({ cart: data });
      get().showToast("Added to cart");
    } catch (err) {
      get().showToast(extractError(err, "Could not add to cart"), "error");
      throw err;
    }
  },

  updateCartItem: async (id, quantity) => {
    const { data } = await api.patch(`/cart/${id}`, { quantity });
    set({ cart: data });
  },

  removeCartItem: async (id) => {
    const { data } = await api.delete(`/cart/${id}`);
    set({ cart: data });
    get().showToast("Removed from cart");
  },

  clearCart: async () => {
    await api.delete("/cart");
    set({ cart: { items: [], subtotal: 0, count: 0 } });
  },

  fetchWishlist: async () => {
    try {
      const { data } = await api.get("/wishlist");
      set({ wishlist: data });
    } catch (_err) {
      // ignore
    }
  },

  toggleWishlist: async (productId) => {
    const { data } = await api.post("/wishlist/toggle", { productId });
    await get().fetchWishlist();
    get().showToast(data.inWishlist ? "Added to wishlist" : "Removed from wishlist");
    return data.inWishlist;
  },
}));

export default useShopStore;
