import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  ContinueButton,
  OnboardingChrome,
} from "../../src/components/onboarding/OnboardingChrome";
import { BRAND, CEFR_LEVELS } from "../../src/constants/onboarding";
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../../src/lib/onboardingProfile";

/**
 * Language & level — CEFR A0–B2 cards matching design.
 */
export default function LevelScreen() {
  const [level, setLevel] = useState<string | null>(null);

  useEffect(() => {
    void loadOnboardingProfile().then((p) => {
      if (p.level) setLevel(p.level);
    });
  }, []);

  async function handleContinue() {
    if (!level) return;
    await saveOnboardingProfile({
      level,
      learnLanguage: "en",
    });
    router.push("/onboarding/goals-intro");
  }

  return (
    <OnboardingChrome
      section="ABOUT YOU"
      step={4}
      totalSteps={5}
      title="What's your current level of English?"
      footer={
        <ContinueButton
          disabled={!level}
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
        bounces={false}
      >
        {CEFR_LEVELS.map((item) => {
          const selected = level === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setLevel(item.id)}
              style={[styles.card, selected && styles.cardSelected]}
            >
              <View style={[styles.badge, selected && styles.badgeSelected]}>
                <Text
                  style={[styles.badgeText, selected && styles.badgeTextSelected]}
                >
                  {item.title}
                </Text>
              </View>
              <Text style={[styles.blurb, selected && styles.blurbSelected]}>
                {item.blurb}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </OnboardingChrome>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BRAND.bg },
  content: { paddingTop: 4, paddingBottom: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
    borderColor: BRAND.border,
    backgroundColor: "#FFFFFF",
    borderRadius: BRAND.radius,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 11,
  },
  cardSelected: {
    borderColor: BRAND.blue,
    backgroundColor: BRAND.blueSoft,
  },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: BRAND.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeSelected: {
    backgroundColor: BRAND.blue,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: "800",
    color: BRAND.blue,
  },
  badgeTextSelected: {
    color: "#FFFFFF",
  },
  blurb: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: BRAND.text,
  },
  blurbSelected: {
    color: BRAND.blueDeep,
  },
});
