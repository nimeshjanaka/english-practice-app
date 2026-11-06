import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import {
  ContinueButton,
  OnboardingChrome,
  OptionButton,
} from "../../src/components/onboarding/OnboardingChrome";
import { BRAND, DIFFICULTIES } from "../../src/constants/onboarding";
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../../src/lib/onboardingProfile";

/**
 * Biggest challenge when learning English.
 */
export default function DifficultyScreen() {
  const [difficulty, setDifficulty] = useState<string | null>(null);

  useEffect(() => {
    void loadOnboardingProfile().then((p) => {
      if (p.difficulty) setDifficulty(p.difficulty);
    });
  }, []);

  async function handleContinue() {
    if (!difficulty) return;
    await saveOnboardingProfile({ difficulty });
    router.push("/onboarding/challenge");
  }

  return (
    <OnboardingChrome
      section="YOUR GOALS"
      step={3}
      totalSteps={4}
      title="What is the most difficult part of learning English for you?"
      footer={
        <ContinueButton
          disabled={!difficulty}
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
        {DIFFICULTIES.map((item) => (
          <OptionButton
            key={item.id}
            emoji={item.emoji}
            label={item.label}
            selected={difficulty === item.id}
            showCheck
            onPress={() => setDifficulty(item.id)}
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
