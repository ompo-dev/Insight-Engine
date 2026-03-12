import axios from "axios";

const DEFAULT_TIMEOUT = 12_000;

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  timeout: DEFAULT_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
    "X-Dashboard-Client": "lynx-analytics-web",
  },
});

apiClient.interceptors.request.use((config) => {
  const nextConfig = { ...config };

  if (!nextConfig.headers["X-Requested-With"]) {
    nextConfig.headers["X-Requested-With"] = "XMLHttpRequest";
  }

  return nextConfig;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ??
      error?.response?.data?.error ??
      error?.message ??
      "Unexpected request failure";

    return Promise.reject(new Error(message));
  },
);
