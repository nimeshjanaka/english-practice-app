import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { OptionButton } from "../../src/components/onboarding/OnboardingChrome";
import { BRAND, LEARNING_GOALS } from "../../src/constants/onboarding";
import { useOnboarding } from "../../src/state/OnboardingContext";

/** Why the learner wants English: Career, Travel, and the rest. */
export default function GoalsScreen() {
  const { profile, update } = useOnboarding();
  const [goal, setGoal] = useState<string | null>(null);

  useEffect(() => {
    if (profile.goal) setGoal(profile.goal);
  }, [profile.goal]);

  async function handleContinue() {
    if (!goal) return;
    await update({ goal });
    router.push("/onboarding/situations");
  }

  return (
    <OnboardingLayout
      section="YOUR GOALS"
      step={0}
      totalSteps={4}
      title="Why do you want to learn English?"
      continueDisabled={!goal}
      onContinue={() => {
        void handleContinue();
      }}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BRAND.bg },
  content: { paddingTop: 4, paddingBottom: 16 },
});
