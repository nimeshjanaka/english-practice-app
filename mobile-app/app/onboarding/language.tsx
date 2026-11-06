import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { OptionButton } from "../../src/components/onboarding/OnboardingChrome";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { BRAND, NATIVE_LANGUAGES } from "../../src/constants/onboarding";
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../../src/lib/onboardingProfile";

/**
 * User details — language the learner already speaks.
 */
export default function NativeLanguageScreen() {
  const [language, setLanguage] = useState<string | null>(null);

  useEffect(() => {
    void loadOnboardingProfile().then((profile) => {
      if (profile.nativeLanguage) setLanguage(profile.nativeLanguage);
    });
  }, []);

  async function handleContinue() {
    if (!language) return;
    await saveOnboardingProfile({ nativeLanguage: language });
    router.push("/onboarding/level");
  }

  return (
    <OnboardingLayout
      section="ABOUT YOU"
      step={3}
      totalSteps={5}
      title="What language do you speak?"
      subtitle="We can explain new English in this language."
      continueDisabled={!language}
      onContinue={() => {
        void handleContinue();
      }}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {NATIVE_LANGUAGES.map((item) => (
          <OptionButton
            key={item.id}
            emoji={item.flag}
            label={item.label}
            selected={language === item.id}
            showCheck
            onPress={() => setLanguage(item.id)}
          />
        ))}
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BRAND.bg },
  content: { paddingTop: 8, paddingBottom: 24 },
});
