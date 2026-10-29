import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Resolve the machine host Expo is talking to (LAN IP on a real device).
 */
function getDevHost(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    // Legacy manifests
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost,
    (Constants as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })
      .manifest2?.extra?.expoGo?.debuggerHost,
  ];

  for (const value of candidates) {
    if (!value || typeof value !== "string") continue;
    const host = value.split(":")[0]?.trim();
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return host;
    }
  }
  return null;
}

/**
 * Backend base URL.
 * - iOS Simulator / web: localhost
 * - Physical device (Expo Go): Mac LAN IP from Expo (phone cannot use localhost)
 *
 * Override anytime with EXPO_PUBLIC_API_URL, e.g. http://192.168.1.10:8000
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const host = getDevHost();
  if (Platform.OS !== "web" && host) {
    return `http://${host}:8000`;
  }

  return "http://localhost:8000";
}

export const TOKEN_KEY = "access_token";

export const AUTH = {
  login: "/api/auth/login",
  register: "/api/auth/register",
  google: "/api/auth/google",
  forgotPassword: "/api/auth/forgot-password",
  resetPassword: "/api/auth/reset-password",
  me: "/api/auth/me",
} as const;

export const UNITS_PATH = "/api/content/units";

/** Voice AI chat — multipart FormData with lesson_id + audio (+ current_question) */
export const AI_CHAT_PATH = "/api/ai/chat";

/** AI KIT TTS for intro / next question — FormData with lesson_id + text */
export const AI_SPEAK_PATH = "/api/ai/speak";

export function lessonExercisesPath(lessonId: string | number): string {
  return `/api/content/lessons/${lessonId}/exercises`;
}

/** Google Web Client ID — set in app.json extra or EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID */
export function getGoogleWebClientId(): string {
  const fromExtra = Constants.expoConfig?.extra?.googleWebClientId as string | undefined;
  return fromExtra || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
}
