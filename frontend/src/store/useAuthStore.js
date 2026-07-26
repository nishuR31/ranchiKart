import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/api";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isCheckingAuth: true,

      isAdmin: () => get().user?.role === "ADMIN",

      login: async (email, password) => {
        const { data } = await api.post("/auth/login", { email, password });
        set({
          token: data.tokens?.accessToken,
          refreshToken: data.tokens?.refreshToken,
          user: data.user,
        });
        return data.user;
      },

      register: async (payload) => {
        const { data } = await api.post("/auth/register", payload);
        set({
          token: data.tokens?.accessToken,
          refreshToken: data.tokens?.refreshToken,
          user: data.user,
        });
        return data.user;
      },

      logout: async () => {
        try {
          await api.post("/auth/logout");
        } catch (err) {
          console.error("Logout failed", err);
        }
        set({ token: null, refreshToken: null, user: null });
      },

      fetchUser: async () => {
        try {
          set({ isCheckingAuth: true });
          const { data } = await api.get("/auth/me");
          set({ user: data.user });
        } catch (err) {
          set({ user: null, token: null, refreshToken: null });
        } finally {
          set({ isCheckingAuth: false });
        }
      },
    }),
    {
      name: "ranchikart-auth",
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);

export default useAuthStore;
