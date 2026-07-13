import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/api";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      isAdmin: () => get().user?.role === "ADMIN",

      login: async (email, password) => {
        const { data } = await api.post("/auth/login", { email, password });
        set({ token: data.tokens?.accessToken, user: data.user });
        return data.user;
      },

      register: async (payload) => {
        const { data } = await api.post("/auth/register", payload);
        set({ token: data.tokens?.accessToken, user: data.user });
        return data.user;
      },

      logout: () => {
        set({ token: null, user: null });
      },
      
      // Fetch current user and token from API (e.g., /auth/me)
      fetchUser: async () => {
        try {
          const { data } = await api.get("/auth/me");
          set({ user: data.user });
        } catch (err) {
          console.error("Failed to fetch auth user", err);
        }
      },
    }),
    {
      name: "auth-storage",
    }
  )
);

export default useAuthStore;
