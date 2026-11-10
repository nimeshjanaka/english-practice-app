import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

import api, { axios } from "../api";
import { AUTH, TOKEN_KEY } from "../constants/api";

export async function saveTokenAndEnterApp(
  accessToken: string,
  href: "/(tabs)" | "/onboarding/complete" = "/(tabs)",
): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, accessToken);
  router.replace(href);
}

export function authErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (err.code === "ERR_NETWORK") {
      return "Cannot reach the API. Check EXPO_PUBLIC_API_URL and that the backend is running.";
    }
  }
  return fallback;
}

export async function loginWithGoogleIdToken(
  idToken: string,
  href: "/(tabs)" | "/onboarding/complete" = "/(tabs)",
): Promise<void> {
  const response = await api.post(AUTH.google, {
    id_token: idToken,
  });
  const accessToken = response.data?.access_token as string | undefined;
  if (!accessToken) {
    throw new Error("Google sign-in succeeded but no token was returned.");
  }
  await saveTokenAndEnterApp(accessToken, href);
}
