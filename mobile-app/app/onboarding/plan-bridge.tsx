import { router } from "expo-router";

import { BlueHeroScreen } from "../../src/components/onboarding/BlueHeroScreen";

const PLAN_ROBOT = require("../../assets/images/plan-robot.jpg");

/**
 * Bridge into plan customization — voice, speed, schedule.
 */
export default function PlanBridgeScreen() {
  return (
    <BlueHeroScreen
      section="BUILD YOUR PLAN"
      step={2}
      totalSteps={4}
      title="Your plan is almost ready"
      subtitle="A few final choices will help us tailor it to your interests and daily routine."
      image={PLAN_ROBOT}
      chips={["Level ✓", "Daily routine", "Interests"]}
      onContinue={() => router.push("/onboarding/voice")}
    />
  );
}
