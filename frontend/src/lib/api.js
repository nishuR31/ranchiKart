import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://0.0.0.0:3000";

const api = axios.create({ baseURL: baseURL + "/api/v1", withCredentials: true });

import useAuthStore from "../store/useAuthStore";

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(token, config)
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success !== undefined && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 (Unauthorized) and we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Prevent infinite loop if the refresh endpoint itself fails with 401
      if (originalRequest.url.includes("/auth/refresh")) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // Try to get a new access token (cookies are automatically sent because withCredentials is true)
        const { data } = await axios.post(baseURL + "/api/v1/auth/refresh", {}, { withCredentials: true });
        
        // Ensure we got an accessToken back
        if (data && data.data && data.data.accessToken) {
          const newAccessToken = data.data.accessToken;
          
          // Update the zustand store so future requests use the new token
          useAuthStore.setState({ token: newAccessToken });
          
          // Retry the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } else {
          // If the backend didn't return an access token, it means refresh failed
          throw new Error("Refresh token failed");
        }
      } catch (refreshError) {
        // Refresh token is expired or invalid, log the user out
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export function extractError(err, fallback = "Something went wrong") {
  return err?.response?.data?.message || err?.response?.data?.error || fallback;
}

export default api;
