import axios, { type AxiosInstance } from "axios";

const DEFAULT_TIMEOUT = 12_000;

export function resolveApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "http://127.0.0.1:4000/api";
}

export function createApiClient(baseURL = resolveApiBaseUrl()): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: DEFAULT_TIMEOUT,
    headers: {
      "Content-Type": "application/json",
      "X-Dashboard-Client": "lynx-unified-canvas"
    }
  });

  client.interceptors.request.use((config) => {
    const nextConfig = { ...config };
    nextConfig.headers = nextConfig.headers ?? {};

    if (!nextConfig.headers["X-Requested-With"]) {
      nextConfig.headers["X-Requested-With"] = "XMLHttpRequest";
    }

    return nextConfig;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const message =
        error?.response?.data?.message ??
        error?.response?.data?.error ??
        error?.message ??
        "Unexpected request failure";

      return Promise.reject(new Error(message));
    }
  );

  return client;
}
