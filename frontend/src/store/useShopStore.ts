import type { CartItem, Product, ProductVariant, User } from "../types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Toast = {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
};

type ShopState = {
  token: string | null;
  user: User | null;
  cart: CartItem[];
  wishlistIds: string[];
  theme: "light" | "dark";
  toasts: Toast[];

  setAuth: (token: string, user: User) => void;
  logout: () => void;
  toggleTheme: () => void;

  addToCart: (item: Omit<CartItem, "id">) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;

  setWishlistIds: (ids: string[]) => void;
  toggleWishlistId: (productId: string) => void;

  showToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
};

function cartKey(
  product: Product,
  variant?: ProductVariant,
  width?: number,
  height?: number,
  text?: string
) {
  return `${product.id}:${variant?.id ?? "base"}:${width ?? "w"}:${height ?? "h"}:${text ?? ""}:${Date.now()}`;
}

export const useShopStore = create<ShopState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      cart: [],
      wishlistIds: [],
      theme: "dark",
      toasts: [],

      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null, wishlistIds: [] }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),

      addToCart: (item) =>
        set((state) => ({
          cart: [
            ...state.cart,
            {
              ...item,
              id: cartKey(item.product, item.variant, item.customWidthMm, item.customHeightMm, item.customText)
            }
          ]
        })),
      removeFromCart: (id) =>
        set((state) => ({ cart: state.cart.filter((i) => i.id !== id) })),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          cart: state.cart.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i))
        })),
      clearCart: () => set({ cart: [] }),

      setWishlistIds: (ids) => set({ wishlistIds: ids }),
      toggleWishlistId: (productId) =>
        set((state) => ({
          wishlistIds: state.wishlistIds.includes(productId)
            ? state.wishlistIds.filter((id) => id !== productId)
            : [...state.wishlistIds, productId]
        })),

      showToast: (toast) => {
        const id = `toast-${Date.now()}`;
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
        setTimeout(() => {
          set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
        }, 4000);
      },
      dismissToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }),
    {
      name: "mudrakart-shop",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        cart: state.cart,
        wishlistIds: state.wishlistIds,
        theme: state.theme
      })
    }
  )
);
