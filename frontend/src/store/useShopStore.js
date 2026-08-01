import { create } from "zustand";
import api, { extractError } from "../lib/api";

// NOTE: The backend does NOT have a /cart endpoint.
// Cart is managed client-side in localStorage; orders are placed via /orders.
// Wishlist lives at /wishlist (backend-persisted).

const CART_KEY = "rk_cart";
const THEME_KEY = "rk_theme_v3";
const SEASONAL_EFFECTS = new Set(["snow", "sparkles", "none"]);
const SEASONAL_MIGRATION_KEY = "rk_seasonal_migrated_v4";

function loadCart() {
  try {
    let cart = JSON.parse(localStorage.getItem(CART_KEY)) || { items: [], subtotal: 0, count: 0 };
    // Sanitize cart to remove corrupted items (e.g. from previous bugs)
    cart.items = (cart.items || []).filter(i => i && typeof i === 'object' && typeof i.id === 'string' && i.name && i.basePrice !== undefined);
    return recalcCart(cart.items);
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
  darkMode: (() => {
    try {
      return localStorage.getItem(THEME_KEY) !== "light";
    } catch {
      return true;
    }
  })(),
  seasonalEffect: (() => {
    try {
      if (localStorage.getItem(SEASONAL_MIGRATION_KEY) !== "true") {
        localStorage.setItem(SEASONAL_MIGRATION_KEY, "true");
        localStorage.setItem("rk_snowfall", "false");
        localStorage.setItem("rk_seasonal_effect", "none");
        return "none";
      }
      const saved = localStorage.getItem("rk_seasonal_effect") || "snow";
      return SEASONAL_EFFECTS.has(saved) ? saved : "snow";
    } catch {
      return "none";
    }
  })(),
  showSnowfall: (() => {
    try {
      if (localStorage.getItem(SEASONAL_MIGRATION_KEY) !== "true") return false;
      return localStorage.getItem("rk_snowfall") !== "false";
    } catch {
      return false;
    }
  })(),

  showToast: (message, type = "success") => {
    set({ toast: { message, type, id: Date.now() } });
    setTimeout(
      () => set((s) => (s.toast?.message === message ? { toast: null } : {})),
      2500
    );
  },

  toggleDarkMode: () => {
    const next = !get().darkMode;
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    set({ darkMode: next });
  },

  toggleSnowfall: () => {
    const next = !get().showSnowfall;
    localStorage.setItem("rk_snowfall", String(next));
    const nextEffect = next && get().seasonalEffect === "none" ? "snow" : get().seasonalEffect;
    localStorage.setItem("rk_seasonal_effect", nextEffect);
    set({ showSnowfall: next, seasonalEffect: nextEffect });
  },

  setSeasonalEffect: (effect) => {
    const nextEffect = SEASONAL_EFFECTS.has(effect) ? effect : "snow";
    localStorage.setItem("rk_seasonal_effect", nextEffect);
    set({ seasonalEffect: nextEffect, showSnowfall: nextEffect !== "none" });
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

  toggleWishlist: async (productOrId) => {
    const productId = typeof productOrId === "object" ? productOrId.id : productOrId;
    const product = typeof productOrId === "object" ? productOrId : null;
    const current = get().wishlist.items || [];
    const existing = current.find((i) => (i.productId ?? i.product?.id ?? i.id) === productId);

    set({
      wishlist: {
        ...get().wishlist,
        items: existing
          ? current.filter((i) => (i.productId ?? i.product?.id ?? i.id) !== productId)
          : [...current, { id: `optimistic-${productId}`, productId, product }],
      },
    });

    try {
      const { data } = await api.post("/wishlist/toggle", { productId });
      const items = get().wishlist.items || [];
      set({
        wishlist: {
          ...get().wishlist,
          items: data.inWishlist
            ? items.map((i) => (i.productId === productId && i.id.startsWith?.("optimistic-") ? { ...i, id: data.id ?? i.id } : i))
            : items.filter((i) => (i.productId ?? i.product?.id ?? i.id) !== productId),
        },
      });
      get().showToast(data.inWishlist ? "Added to wishlist" : "Removed from wishlist");
      return data.inWishlist;
    } catch (err) {
      set({ wishlist: { ...get().wishlist, items: current } });
      get().showToast(extractError(err, "Could not update wishlist"), "error");
      throw err;
    }
  },
}));

export default useShopStore;
