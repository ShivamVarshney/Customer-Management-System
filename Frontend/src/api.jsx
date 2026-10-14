import axios from "axios";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "./components/workspaceStorage";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    const workspaceId = localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    if (workspaceId) config.headers["X-Workspace-Id"] = workspaceId;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRequest = error.config?.url?.startsWith("/auth/");

    if (error.response?.status === 401 && !isAuthRequest && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
      window.dispatchEvent(new Event("auth:session-expired"));
    }

    return Promise.reject(error);
  }
);

export default api;
