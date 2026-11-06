import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import {
  ContinueButton,
  OnboardingChrome,
  OptionButton,
} from "../../src/components/onboarding/OnboardingChrome";
import { BRAND, SITUATIONS } from "../../src/constants/onboarding";
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../../src/lib/onboardingProfile";

/**
 * Situations the learner wants to be ready for (multi-select).
 */
export default function SituationsScreen() {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    void loadOnboardingProfile().then((p) => {
      if (p.situations?.length) setSelected(p.situations);
    });
  }, []);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleContinue() {
    if (!selected.length) return;
    await saveOnboardingProfile({ situations: selected });
    router.push("/onboarding/focus");
  }

  return (
    <OnboardingChrome
      section="YOUR GOALS"
      step={1}
      totalSteps={4}
      title="Pick the situations you want to be ready for"
      footer={
        <ContinueButton
          disabled={!selected.length}
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
        {SITUATIONS.map((item) => (
          <OptionButton
            key={item.id}
            emoji={item.emoji}
            label={item.label}
            selected={selected.includes(item.id)}
            showCheck
            onPress={() => toggle(item.id)}
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
