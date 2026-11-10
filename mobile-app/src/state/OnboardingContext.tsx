import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { OnboardingProfile } from "../constants/onboarding";
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../lib/onboardingProfile";

type OnboardingState = {
  profile: OnboardingProfile;
  ready: boolean;
  update: (patch: Partial<OnboardingProfile>) => Promise<OnboardingProfile>;
};

const OnboardingContext = createContext<OnboardingState | null>(null);

/** In-memory onboarding answers, also written to storage for the later API call. */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<OnboardingProfile>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadOnboardingProfile().then((saved) => {
      if (cancelled) return;
      setProfile(saved);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(async (patch: Partial<OnboardingProfile>) => {
    const next = await saveOnboardingProfile(patch);
    setProfile(next);
    return next;
  }, []);

  const value = useMemo(
    () => ({ profile, ready, update }),
    [profile, ready, update],
  );

  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingState {
  const value = useContext(OnboardingContext);
  if (!value) {
    throw new Error("useOnboarding must be used inside OnboardingProvider");
  }
  return value;
}
