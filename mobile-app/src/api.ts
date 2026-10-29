import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router } from "expo-router";

import { getApiBaseUrl, TOKEN_KEY } from "./constants/api";

/**
 * Shared Axios client — attaches JWT from AsyncStorage on every request.
 * baseURL is resolved per request so device LAN IPs stay correct.
 */
const api = axios.create({
  timeout: 30_000,
});

api.interceptors.request.use(async (config) => {
  config.baseURL = getApiBaseUrl();

  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url ?? "");
    const isAuthRoute = url.includes("/api/auth/");

    // Login/register 401 = bad credentials — do not force logout redirect
    if (status === 401 && !isAuthRoute) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      router.replace("/");
    }

    return Promise.reject(error);
  },
);

export default api;
export { axios };
