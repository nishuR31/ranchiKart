import { create } from "zustand";
import api from "../lib/api";

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,

  isAdmin: () => get().user?.role === "ADMIN",

  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    set({ token: data.token, user: data.user });
    return data.user;
  },

  register: async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    set({ token: data.token, user: data.user });
    return data.user;
  },

  logout: () => {
    set({ token: null, user: null });
  },
  // Fetch current user and token from API (e.g., /auth/me)
  fetchUser: async () => {
    try {
      const { data } = await api.get("/auth/me");
      // Assume API returns { user, token }
      set({ user: data.user, token: data.token });
    } catch (err) {
      console.error("Failed to fetch auth user", err);
    }
  },
}));

export default useAuthStore;
