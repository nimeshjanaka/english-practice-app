import type { ReactNode } from "react";

import { ContinueButton, OnboardingChrome } from "./OnboardingChrome";

type OnboardingLayoutProps = {
  section: string;
  /** 0-based active step inside this section. */
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  continueLabel?: string;
  continueDisabled?: boolean;
  onContinue: () => void;
  showBack?: boolean;
};

/**
 * Shared onboarding frame: progress bar at the top, Continue at the bottom.
 */
export function OnboardingLayout({
  section,
  step,
  totalSteps,
  title,
  subtitle,
  children,
  continueLabel = "Continue",
  continueDisabled,
  onContinue,
  showBack = true,
}: OnboardingLayoutProps) {
  return (
    <OnboardingChrome
      section={section}
      step={step}
      totalSteps={totalSteps}
      title={title}
      subtitle={subtitle}
      showBack={showBack}
      footer={
        <ContinueButton
          label={continueLabel}
          disabled={continueDisabled}
          onPress={onContinue}
        />
      }
    >
      {children}
    </OnboardingChrome>
  );
}
