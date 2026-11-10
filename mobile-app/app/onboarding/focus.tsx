import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import {
  ContinueButton,
  OnboardingChrome,
  OptionButton,
} from "../../src/components/onboarding/OnboardingChrome";
import { BRAND, FOCUS_AREAS } from "../../src/constants/onboarding";
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../../src/lib/onboardingProfile";

/**
 * Main learning focus — Listening / Vocabulary / Speaking.
 */
export default function FocusScreen() {
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    void loadOnboardingProfile().then((p) => {
      if (p.focus) setFocus(p.focus);
    });
  }, []);

  async function handleContinue() {
    if (!focus) return;
    await saveOnboardingProfile({ focus });
    router.push("/onboarding/difficulty");
  }

  return (
    <OnboardingChrome
      section="YOUR GOALS"
      step={2}
      totalSteps={4}
      title="What is your main focus?"
      footer={
        <ContinueButton
          disabled={!focus}
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
        {FOCUS_AREAS.map((item) => (
          <OptionButton
            key={item.id}
            label={item.label}
            selected={focus === item.id}
            showCheck
            onPress={() => setFocus(item.id)}
          />
        ))}
      </ScrollView>
    </OnboardingChrome>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BRAND.bg },
  content: { paddingTop: 12, paddingBottom: 16 },
});
