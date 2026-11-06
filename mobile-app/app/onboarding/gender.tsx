import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import {
  OnboardingChrome,
  OptionButton,
} from "../../src/components/onboarding/OnboardingChrome";
import { BRAND, GENDERS } from "../../src/constants/onboarding";
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../../src/lib/onboardingProfile";

/**
 * User details — gender.
 */
export default function GenderScreen() {
  const [gender, setGender] = useState<string | null>(null);

  useEffect(() => {
    void loadOnboardingProfile().then((p) => {
      if (p.gender) setGender(p.gender);
    });
  }, []);

  async function handleSelect(value: string) {
    setGender(value);
    await saveOnboardingProfile({ gender: value });
    router.push("/onboarding/language");
  }

  return (
    <OnboardingChrome
      section="ABOUT YOU"
      step={2}
      totalSteps={5}
      title="What's your gender?"
      subtitle="Just to personalize your experience. This stays private."
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {GENDERS.map((g) => (
          <OptionButton
            key={g}
            label={g}
            selected={gender === g}
            onPress={() => {
              void handleSelect(g);
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
