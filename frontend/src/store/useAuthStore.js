import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../lib/api";

// After the response interceptor, response.data IS the inner payload.
// Backend returns: { success, data: { user, tokens: { accessToken, refreshToken } } }
// After unwrap:   response.data = { user, tokens: { ... } }

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isCheckingAuth: true,

      isAdmin: () => ["ADMIN", "MANAGER"].includes(get().user?.role),

      login: async (emailOrUsername, password, totpToken) => {
        const payload = { emailOrUsername, password };
        if (totpToken) payload.totpToken = totpToken;
        const { data } = await api.post("/auth/login", payload);
        
        // If the backend requires TOTP but it wasn't provided, 
        // the backend returns { requireTotp: true } without tokens.
        if (data.requireTotp) {
          return { requireTotp: true };
        }

        // data = { user, tokens: { accessToken, refreshToken } }
        set({
          token: data.tokens?.accessToken,
          refreshToken: data.tokens?.refreshToken,
          user: data.user,
        });
        return data.user;
      },

      register: async (payload) => {
        // API requires: email, name, password. Phone is optional.
        const { data } = await api.post("/auth/register", {
          email: payload.email,
          name: payload.name,
          password: payload.password,
          ...(payload.phone ? { phone: payload.phone } : {}),
        });
        set({
          token: data.tokens?.accessToken,
          refreshToken: data.tokens?.refreshToken,
          user: data.user,
        });
        return data.user;
      },

      logout: async () => {
        const token = get().token;
        set({ token: null, refreshToken: null, user: null });
        if (token) {
          try {
            // Bypass api interceptors completely to avoid infinite loop
            await fetch("/api/v1/auth/logout", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` }
            });
          } catch {
            // ignore
          }
        }
      },

      fetchUser: async () => {
        try {
          set({ isCheckingAuth: true });
          const { data } = await api.get("/auth/me");
          // data = { user: {...} }  or the user object itself depending on backend shape
          // Backend /auth/me returns { success, data: { user } }  → after unwrap: { user }
          set({ user: data.user ?? data });
        } catch {
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
