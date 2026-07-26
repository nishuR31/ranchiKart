import { create } from "zustand";
import api from "../lib/api";

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isCheckingAuth: true,

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

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout failed", err);
    }
    set({ token: null, user: null });
  },
  
  // Fetch current user from API (e.g., /auth/me)
  fetchUser: async () => {
    try {
      set({ isCheckingAuth: true });
      const { data } = await api.get("/auth/me");
      set({ user: data.user });
    } catch (err) {
      set({ user: null, token: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },
}));

export default useAuthStore;
