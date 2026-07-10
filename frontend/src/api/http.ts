import axios from "axios";

const desktopRuntime = (window as unknown as {
  triadfsDesktop?: {
    backend?: {
      apiBaseUrl?: string | null;
      standalone?: boolean;
      getAccessToken?: () => Promise<string | null>;
    };
  };
}).triadfsDesktop;

export const http = axios.create({
  baseURL: desktopRuntime?.backend?.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1",
  timeout: 10_000
});

http.interceptors.request.use(async (config) => {
  const token = desktopRuntime?.backend?.standalone
    ? (await desktopRuntime.backend.getAccessToken?.()) ?? localStorage.getItem("triadfs-access-token")
    : localStorage.getItem("triadfs-access-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
