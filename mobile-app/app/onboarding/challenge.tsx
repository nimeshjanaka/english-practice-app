import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  ContinueButton,
  OnboardingChrome,
  OptionButton,
} from "../../src/components/onboarding/OnboardingChrome";
import {
  BRAND,
  CHALLENGE_QUESTIONS,
  estimateLevelFromAnswers,
} from "../../src/constants/onboarding";
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../../src/lib/onboardingProfile";

/**
 * Placement quiz — multiple-choice challenges (design-matched).
 */
export default function ChallengeScreen() {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);

  const question = CHALLENGE_QUESTIONS[index];
  const total = CHALLENGE_QUESTIONS.length;

  useEffect(() => {
    void loadOnboardingProfile().then((p) => {
      if (p.challengeAnswers?.length) {
        setAnswers(p.challengeAnswers.map((v) => Number(v)));
      }
    });
  }, []);

  const encouragement = useMemo(() => {
    if (index === 0) return null;
    return "Nice work so far.";
  }, [index]);

  async function handleContinue() {
    if (chosen === null || !question) return;
    const nextAnswers = [...answers];
    nextAnswers[index] = chosen;
    setAnswers(nextAnswers);

    if (index < total - 1) {
      setIndex((i) => i + 1);
      setChosen(nextAnswers[index + 1] ?? null);
      return;
    }

    const scored = CHALLENGE_QUESTIONS.map((q, i) => ({
      correctIndex: q.correctIndex,
      chosenIndex: nextAnswers[i] ?? -1,
      band: q.band,
    }));
    const testedLevel = estimateLevelFromAnswers(scored);

    await saveOnboardingProfile({
      challengeAnswers: nextAnswers.map(String),
      testedLevel,
      level: testedLevel,
    });
    router.push("/onboarding/challenge-result");
  }

  if (!question) return null;

  return (
    <OnboardingChrome
      section="YOUR CHALLENGES"
      step={index}
      totalSteps={total}
      title=""
      footer={
        <View>
          {encouragement ? (
            <View style={styles.encourage}>
              <View style={styles.mascotBubble}>
                <Text style={styles.mascotEmoji}>💪</Text>
              </View>
              <Text style={styles.encourageText}>{encouragement}</Text>
            </View>
          ) : null}
          <ContinueButton
            disabled={chosen === null}
            onPress={() => {
              void handleContinue();
            }}
          />
        </View>
      }
    >
      <Text style={styles.prompt}>{question.prompt}</Text>
      <Text style={styles.sentence}>{question.sentence}</Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {question.options.map((opt, i) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={chosen === i}
            onPress={() => setChosen(i)}
          />
        ))}
      </ScrollView>
    </OnboardingChrome>
  );
}

const styles = StyleSheet.create({
  prompt: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: BRAND.muted,
    marginBottom: 10,
    marginTop: -8,
  },
  sentence: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "800",
    color: BRAND.text,
    marginBottom: 22,
    letterSpacing: -0.3,
  },
  scroll: { flex: 1 },
  content: { paddingBottom: 8 },
  encourage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: BRAND.blueSoft,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  mascotBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  mascotEmoji: { fontSize: 20 },
  encourageText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: BRAND.text,
  },
});
