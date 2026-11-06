import { router } from "expo-router";
import { Volume2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  ContinueButton,
  OnboardingChrome,
} from "../../src/components/onboarding/OnboardingChrome";
import { BRAND, TUTOR_SPEEDS } from "../../src/constants/onboarding";
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../../src/lib/onboardingProfile";

/**
 * Choose tutor speaking speed.
 */
export default function SpeedScreen() {
  const [tutorSpeed, setTutorSpeed] = useState<number | null>(1.0);

  useEffect(() => {
    void loadOnboardingProfile().then((p) => {
      if (typeof p.tutorSpeed === "number") setTutorSpeed(p.tutorSpeed);
    });
  }, []);

  async function handleContinue() {
    if (tutorSpeed === null) return;
    await saveOnboardingProfile({ tutorSpeed });
    router.push("/onboarding/timeline");
  }

  return (
    <OnboardingChrome
      section="BUILD YOUR PLAN"
      step={1}
      totalSteps={5}
      title="How fast should your tutor speak?"
      subtitle="Tap the icons to hear examples. You can always change it later."
      footer={
        <ContinueButton
          disabled={tutorSpeed === null}
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
        {TUTOR_SPEEDS.map((item) => {
          const selected = tutorSpeed === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setTutorSpeed(item.id)}
              style={[styles.card, selected && styles.cardSelected]}
            >
              <View style={styles.meta}>
                <Text style={[styles.label, selected && styles.labelSelected]}>
                  {item.label}
                </Text>
                <Text style={styles.hint}>{item.hint}</Text>
              </View>
              <View style={styles.speaker}>
                <Volume2 size={16} color="#FFFFFF" strokeWidth={2.4} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </OnboardingChrome>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: BRAND.border,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  cardSelected: {
    borderColor: BRAND.blue,
    backgroundColor: BRAND.blueSoft,
  },
  meta: { flex: 1 },
  label: { fontSize: 16, fontWeight: "800", color: BRAND.text },
  labelSelected: { color: BRAND.blue },
  hint: { marginTop: 2, fontSize: 13, color: BRAND.muted, fontWeight: "500" },
  speaker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BRAND.blue,
    alignItems: "center",
    justifyContent: "center",
  },
});
