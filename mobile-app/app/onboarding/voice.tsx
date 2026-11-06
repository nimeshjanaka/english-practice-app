import { router } from "expo-router";
import { Volume2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  ContinueButton,
  OnboardingChrome,
} from "../../src/components/onboarding/OnboardingChrome";
import { BRAND, TUTORS } from "../../src/constants/onboarding";
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../../src/lib/onboardingProfile";

const AVATAR_COLORS: Record<string, string> = {
  nova: "#5EEAD4",
  joanna: "#FDBA74",
  mia: "#F9A8D4",
  ben: "#93C5FD",
};

/**
 * Choose AI tutor voice / tone — card UI matching mocks.
 */
export default function VoiceScreen() {
  const [tutorVoice, setTutorVoice] = useState<string | null>("nova");

  useEffect(() => {
    void loadOnboardingProfile().then((p) => {
      if (p.tutorVoice) setTutorVoice(p.tutorVoice);
    });
  }, []);

  async function handleContinue() {
    if (!tutorVoice) return;
    await saveOnboardingProfile({ tutorVoice });
    router.push("/onboarding/speed");
  }

  return (
    <OnboardingChrome
      section="BUILD YOUR PLAN"
      step={0}
      totalSteps={5}
      title="Which tutor's voice do you prefer?"
      subtitle="This only affects how the voice sounds"
      footer={
        <ContinueButton
          disabled={!tutorVoice}
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
        {TUTORS.map((tutor) => {
          const selected = tutorVoice === tutor.id;
          return (
            <Pressable
              key={tutor.id}
              onPress={() => setTutorVoice(tutor.id)}
              style={[styles.card, selected && styles.cardSelected]}
            >
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: AVATAR_COLORS[tutor.id] ?? BRAND.blueMuted },
                ]}
              >
                <Text style={styles.avatarText}>{tutor.name.slice(0, 1)}</Text>
              </View>
              <View style={styles.meta}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, selected && styles.nameSelected]}>
                    {tutor.name}
                  </Text>
                  <View style={styles.volumeBtn}>
                    <Volume2 size={14} color={BRAND.blue} strokeWidth={2.4} />
                  </View>
                </View>
                <Text style={styles.origin}>{tutor.origin}</Text>
                <Text style={styles.traits}>{tutor.traits}</Text>
                <View style={styles.tag}>
                  <Text style={styles.tagText} numberOfLines={1}>
                    {tutor.tagline}
                  </Text>
                </View>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <Text style={styles.radioMark}>✓</Text> : null}
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
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: BRAND.bgWash,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "transparent",
    padding: 14,
    marginBottom: 12,
  },
  cardSelected: {
    backgroundColor: BRAND.blueSoft,
    borderColor: BRAND.blue,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "800",
    color: BRAND.text,
  },
  meta: { flex: 1, gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 16, fontWeight: "800", color: BRAND.text },
  nameSelected: { color: BRAND.blue },
  volumeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  origin: { fontSize: 13, color: BRAND.muted, fontWeight: "600" },
  traits: { fontSize: 12, color: "#A0A8BA", fontWeight: "500" },
  tag: {
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    color: BRAND.blue,
    fontWeight: "700",
    maxWidth: 180,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#C9D0E0",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    backgroundColor: "#FFFFFF",
  },
  radioSelected: {
    backgroundColor: BRAND.blue,
    borderColor: BRAND.blue,
  },
  radioMark: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
});
