import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router } from "expo-router";

import { AUTH, getApiBaseUrl, TOKEN_KEY } from "../constants/api";

export async function saveTokenAndEnterApp(accessToken: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, accessToken);
  router.replace("/(tabs)");
}

export function authErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (err.code === "ERR_NETWORK") {
      return "Cannot reach the API. Is the backend running on port 8000?";
    }
  }
  return fallback;
}

export async function loginWithGoogleIdToken(idToken: string): Promise<void> {
  const response = await axios.post(`${getApiBaseUrl()}${AUTH.google}`, {
    id_token: idToken,
  });
  const accessToken = response.data?.access_token as string | undefined;
  if (!accessToken) {
    throw new Error("Google sign-in succeeded but no token was returned.");
  }
  await saveTokenAndEnterApp(accessToken);
}
