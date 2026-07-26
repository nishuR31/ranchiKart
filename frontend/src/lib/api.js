import axios from "axios";
import useAuthStore from "../store/useAuthStore";

const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      response.data.success !== undefined &&
      "data" in response.data
    ) {
      response.data = response.data.data;
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        const { data } = await api.post("/auth/refresh", { refreshToken });

        const accessToken = data?.accessToken;

        if (!accessToken) {
          throw new Error("No access token returned");
        }

        useAuthStore.setState({
          token: accessToken,
        });

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (err) {
        useAuthStore.getState().logout();
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export function extractError(
  err,
  fallback = "Something went wrong"
) {
  return (
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    fallback
  );
}

export default api;