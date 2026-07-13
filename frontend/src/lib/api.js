import axios from "axios";

const baseURL = import.meta.env.ENVIRONMENT !== "dev" ? import.meta.env.VITE_API_URL : "http://localhost:3000";

const api = axios.create({ baseURL: baseURL + "/api/v1" });

import useAuthStore from "../store/useAuthStore";

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use((response) => {
  if (response.data && response.data.success !== undefined && 'data' in response.data) {
    response.data = response.data.data;
  }
  return response;
});

export function extractError(err, fallback = "Something went wrong") {
  return err?.response?.data?.message || err?.response?.data?.error || fallback;
}

export default api;
