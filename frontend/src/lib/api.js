import axios from "axios";
import useAuthStore from "../store/useAuthStore";

// Proxy in vite.config.js maps /api → http://0.0.0.0:3000
// So all calls use relative baseURL "/api/v1" — no VITE_API_URL needed in dev.
const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});

// Attach bearer token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap backend envelope { success: true, data: {...} }
// After this, `response.data` IS the inner data object.
api.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      typeof response.data === "object" &&
      "success" in response.data &&
      "data" in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Auto-refresh on 401
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/logout")
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        // Bypass interceptor to avoid infinite loop — call axios directly
        const res = await axios.post("/api/v1/auth/refresh", { refreshToken });
        const payload = res.data?.data ?? res.data;
        const accessToken = payload?.accessToken;

        if (!accessToken) throw new Error("No access token returned");

        useAuthStore.setState({ token: accessToken });
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Pull a human-readable message out of an axios error.
 */
export function extractError(err, fallback = "Something went wrong") {
  const serverMessage = err?.response?.data?.message ?? err?.response?.data?.error;
  if (serverMessage) {
    if (/prisma|tx\.|invocation|stack|record was found|failed because it depends/i.test(serverMessage)) {
      return fallback;
    }
    if (serverMessage.startsWith("{")) {
      try {
        const parsed = JSON.parse(serverMessage);
        return parsed.banReason || parsed.message || fallback;
      } catch {
        return fallback;
      }
    }
    return serverMessage;
  }

  const name = err?.name || err?.cause?.name;
  const message = String(err?.message || "");
  if (["AbortError", "NotAllowedError", "SecurityError", "InvalidStateError"].includes(name)) {
    if (name === "InvalidStateError") return "This passkey is already registered on this device.";
    return "The security prompt was cancelled or timed out.";
  }
  if (/webauthn|credential|authenticator|publickey|notallowed|abort/i.test(message)) {
    return "The passkey action could not be completed. Please try again.";
  }
  if (/network error/i.test(message)) return "Network error. Please check your connection and try again.";

  return fallback;
}

export default api;
