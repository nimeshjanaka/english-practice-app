import { router } from "expo-router";

import { BlueHeroScreen } from "../../src/components/onboarding/BlueHeroScreen";

const ABOUT_ROBOT = require("../../assets/images/about-robot.jpg");

/**
 * About You intro — design-matched blue hero with robot asset.
 */
export default function AboutYouIntroScreen() {
  return (
    <BlueHeroScreen
      section="ABOUT YOU"
      step={0}
      totalSteps={5}
      title="Glad you're here!"
      subtitle="Before we build your learning plan, let's get to know you!"
      image={ABOUT_ROBOT}
      onContinue={() => router.push("/onboarding/name")}
    />
  );
}
