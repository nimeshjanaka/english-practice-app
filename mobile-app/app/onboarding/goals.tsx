import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import {
  ContinueButton,
  OnboardingChrome,
  OptionButton,
} from "../../src/components/onboarding/OnboardingChrome";
import { BRAND, LEARNING_GOALS } from "../../src/constants/onboarding";
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../../src/lib/onboardingProfile";

/**
 * Why do you want to learn English? (Career, Travel, Speaking, …).
 */
export default function GoalsScreen() {
  const [goal, setGoal] = useState<string | null>(null);

  useEffect(() => {
    void loadOnboardingProfile().then((p) => {
      if (p.goal) setGoal(p.goal);
    });
  }, []);

  async function handleContinue() {
    if (!goal) return;
    await saveOnboardingProfile({ goal });
    router.push("/onboarding/situations");
  }

  return (
    <OnboardingChrome
      section="YOUR GOALS"
      step={0}
      totalSteps={4}
      title="Why do you want to learn English?"
      footer={
        <ContinueButton
          disabled={!goal}
          onPress={() => {
            void handleContinue();
          }}
        />
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {LEARNING_GOALS.map((item) => (
          <OptionButton
            key={item.id}
            emoji={item.emoji}
            label={item.label}
            selected={goal === item.id}
            showCheck
            onPress={() => setGoal(item.id)}
          />
        ))}
      </ScrollView>
    </OnboardingChrome>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BRAND.bg },
  content: { paddingTop: 4, paddingBottom: 16 },
});
