import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import {
  OnboardingChrome,
  OptionButton,
} from "../../src/components/onboarding/OnboardingChrome";
import { AGE_RANGES, BRAND } from "../../src/constants/onboarding";
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../../src/lib/onboardingProfile";

/**
 * User details — age range.
 */
export default function AgeScreen() {
  const [ageRange, setAgeRange] = useState<string | null>(null);

  useEffect(() => {
    void loadOnboardingProfile().then((p) => {
      if (p.ageRange) setAgeRange(p.ageRange);
    });
  }, []);

  async function handleSelect(value: string) {
    setAgeRange(value);
    await saveOnboardingProfile({ ageRange: value });
    router.push("/onboarding/gender");
  }

  return (
    <OnboardingChrome
      section="ABOUT YOU"
      step={1}
      totalSteps={5}
      title="What's your age range?"
      subtitle="Each age learns differently. We'll adapt your practice to work best for you."
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {AGE_RANGES.map((range) => (
          <OptionButton
            key={range}
            label={range}
            selected={ageRange === range}
            onPress={() => {
              void handleSelect(range);
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
