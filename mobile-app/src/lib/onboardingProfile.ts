import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  ONBOARDING_PROFILE_KEY,
  ONBOARDING_SEEN_KEY,
  type OnboardingProfile,
} from "../constants/onboarding";

export async function loadOnboardingProfile(): Promise<OnboardingProfile> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_PROFILE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as OnboardingProfile;
  } catch {
    return {};
  }
}

export async function saveOnboardingProfile(
  patch: Partial<OnboardingProfile>,
): Promise<OnboardingProfile> {
  const current = await loadOnboardingProfile();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(ONBOARDING_PROFILE_KEY, JSON.stringify(next));
  return next;
}

export async function markOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, "1");
}
