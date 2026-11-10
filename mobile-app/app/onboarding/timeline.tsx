import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import {
  OnboardingChrome,
  OptionButton,
} from "../../src/components/onboarding/OnboardingChrome";
import { BRAND, GOAL_TIMELINES } from "../../src/constants/onboarding";
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../../src/lib/onboardingProfile";

/**
 * Expected timeline to achieve the learning goal.
 */
export default function TimelineScreen() {
  const [goalTimeline, setGoalTimeline] = useState<string | null>(null);

  useEffect(() => {
    void loadOnboardingProfile().then((p) => {
      if (p.goalTimeline) setGoalTimeline(p.goalTimeline);
    });
  }, []);

  async function handleSelect(value: string) {
    setGoalTimeline(value);
    await saveOnboardingProfile({ goalTimeline: value });
    router.push("/onboarding/daily");
  }

  return (
    <OnboardingChrome
      section="BUILD YOUR PLAN"
      step={2}
      totalSteps={5}
      title="How long do you expect to achieve your goal?"
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {GOAL_TIMELINES.map((item) => (
          <OptionButton
            key={item}
            label={item}
            selected={goalTimeline === item}
            onPress={() => {
              void handleSelect(item);
            }}
          />
        ))}
      </ScrollView>
    </OnboardingChrome>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BRAND.bg },
  content: { paddingTop: 8, paddingBottom: 24 },
});
