import { router } from "expo-router";

import { BlueHeroScreen } from "../../src/components/onboarding/BlueHeroScreen";

const GOALS_ROBOT = require("../../assets/images/goals-robot.jpg");

/**
 * Goals section intro — blue interstitial.
 */
export default function GoalsIntroScreen() {
  return (
    <BlueHeroScreen
      section="YOUR GOALS"
      step={0}
      totalSteps={4}
      title="Now let's make your goal clear"
      subtitle="Tell us what matters most to you about learning English."
      image={GOALS_ROBOT}
      chips={["Vocabulary", "Speaking", "grammar"]}
      onContinue={() => router.push("/onboarding/goals")}
    />
  );
}
