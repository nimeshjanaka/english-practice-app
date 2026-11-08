import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Resolve the machine host Expo is talking to (LAN IP on a real device).
 */
function getDevHost(): string | null {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
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
 * Backend base URL from EXPO_PUBLIC_API_URL.
 *
 * On a physical device, if the env URL uses localhost, rewrite the host to the
 * Expo LAN IP so the phone can reach your Mac (localhost on the phone is itself).
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!fromEnv) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is missing. Add it to mobile-app/.env (see .env.example).",
    );
  }

  const cleaned = fromEnv.replace(/\/$/, "");

  try {
    const parsed = new URL(cleaned);
    const isLoopback = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (Platform.OS !== "web" && isLoopback) {
      const lanHost = getDevHost();
      if (lanHost) {
        parsed.hostname = lanHost;
        return parsed.toString().replace(/\/$/, "");
      }
    }
  } catch {
    // Fall through and return the raw env value.
  }

  return cleaned;
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

/** Learner courses with nested lessons for the learning path. */
export const COURSES_PATH = "/api/v1/courses";

/** Voice AI chat — multipart FormData with lesson_id + audio (+ current_question) */
export const AI_CHAT_PATH = "/api/ai/chat";

/** AI KIT TTS for intro / next question — FormData with lesson_id + text */
export const AI_SPEAK_PATH = "/api/ai/speak";

export function lessonExercisesPath(lessonId: string | number): string {
  return `/api/content/lessons/${lessonId}/exercises`;
}

export function exerciseSubmitPath(exerciseId: string | number): string {
  return `/api/content/exercises/${exerciseId}/submit`;
}

export function exerciseAttemptPath(exerciseId: string | number): string {
  return `/api/v1/exercises/${exerciseId}/attempts`;
}

/** Profile overview: lessons completed, speaking time, streak. */
export const PROGRESS_OVERVIEW_PATH = "/api/v1/progress/overview";

/** Close an AI chat / practice block and store duration. */
export const PROGRESS_SESSION_END_PATH = "/api/v1/progress/sessions/end";

export function speakingSessionEndPath(sessionId: string): string {
  return `/api/v1/speaking/sessions/${sessionId}/end`;
}

/** Google Web Client ID — set in app.json extra or EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID */
export function getGoogleWebClientId(): string {
  const fromExtra = Constants.expoConfig?.extra?.googleWebClientId as string | undefined;
  return fromExtra || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
}
