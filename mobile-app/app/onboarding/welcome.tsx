import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { BRAND } from "../../src/constants/onboarding";

/** First onboarding step after the splash. */
export default function WelcomeScreen() {
  return (
    <OnboardingLayout
      section="WELCOME"
      step={0}
      totalSteps={4}
      title="Your Personal English Tutor"
      subtitle="Practice real conversations with an AI tutor, whenever you have a few minutes."
      showBack={false}
      onContinue={() => router.push("/onboarding/name")}
    >
      <View style={styles.card}>
        <Text style={styles.emoji}>🤖</Text>
        <Text style={styles.cardText}>Lessons, speaking practice, and gentle corrections in one place.</Text>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: BRAND.blueSoft,
    padding: 24,
    alignItems: "center",
  },
  emoji: { fontSize: 42 },
  cardText: {
    marginTop: 12,
    textAlign: "center",
    color: BRAND.text,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
});
