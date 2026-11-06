import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  ContinueButton,
  OnboardingChrome,
} from "../../src/components/onboarding/OnboardingChrome";
import { BRAND } from "../../src/constants/onboarding";
import { markOnboardingSeen } from "../../src/lib/onboardingProfile";

const FEATURES = [
  {
    emoji: "📗",
    title: "Practise whenever you want",
    body: "You will practise speaking in 300+ real-life scenarios, from work and travel to everyday life.",
  },
  {
    emoji: "💪",
    title: "A plan built around you",
    body: "You will get practice matched to your goals, level, interests, and daily routine.",
  },
  {
    emoji: "✨",
    title: "Improve every time you speak",
    body: "You will get instant guidance on your pronunciation, grammar, vocabulary, and expression.",
  },
  {
    emoji: "📈",
    title: "See how far you've come",
    body: "You will track your progress, review recurring mistakes, and know what to focus on next.",
  },
] as const;

/**
 * Final plan overview — value props, then create account.
 */
export default function PlanFeaturesScreen() {
  async function handleContinue() {
    await markOnboardingSeen();
    router.replace("/register");
  }

  return (
    <OnboardingChrome
      section="BUILD YOUR PLAN"
      step={4}
      totalSteps={5}
      title="Everything you need to speak with confidence"
      footer={
        <ContinueButton
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
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.row}>
            <Text style={styles.emoji}>{f.emoji}</Text>
            <View style={styles.meta}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureBody}>{f.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </OnboardingChrome>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 12, gap: 18 },
  row: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  emoji: { fontSize: 28, marginTop: 2 },
  meta: { flex: 1 },
  featureTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: BRAND.text,
    marginBottom: 4,
  },
  featureBody: {
    fontSize: 13,
    lineHeight: 19,
    color: BRAND.muted,
    fontWeight: "500",
  },
});
