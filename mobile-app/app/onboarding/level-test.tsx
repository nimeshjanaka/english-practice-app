import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { OptionButton } from "../../src/components/onboarding/OnboardingChrome";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { BRAND, CHALLENGE_QUESTIONS } from "../../src/constants/onboarding";
import { useOnboarding } from "../../src/state/OnboardingContext";

const QUESTION = CHALLENGE_QUESTIONS[0];

function levelForAnswer(chosen: number): string {
  if (chosen === QUESTION.correctIndex) return "A2";
  if (QUESTION.options[chosen] === "I'm not sure") return "A0";
  return "A1";
}

/** One placement question, matching the cooking-sentence check. */
export default function LevelTestScreen() {
  const { profile, update } = useOnboarding();
  const [chosen, setChosen] = useState<number | null>(null);

  useEffect(() => {
    if (!profile.levelTestAnswer) return;
    const index = QUESTION.options.indexOf(profile.levelTestAnswer);
    if (index >= 0) setChosen(index);
  }, [profile.levelTestAnswer]);

  async function handleContinue() {
    if (chosen === null) return;
    const answer = QUESTION.options[chosen];
    const testedLevel = levelForAnswer(chosen);
    await update({
      levelTestAnswer: answer,
      testedLevel,
      level: testedLevel,
    });
    router.push("/onboarding/goals-intro");
  }

  return (
    <OnboardingLayout
      section="LEVEL TEST"
      step={0}
      totalSteps={1}
      title=""
      continueDisabled={chosen === null}
      onContinue={() => {
        void handleContinue();
      }}
    >
      <Text style={styles.prompt}>{QUESTION.prompt}</Text>
      <Text style={styles.sentence}>{QUESTION.sentence}</Text>
      <ScrollView contentContainerStyle={styles.options} showsVerticalScrollIndicator={false}>
        {QUESTION.options.map((option, index) => (
          <OptionButton
            key={option}
            label={option}
            selected={chosen === index}
            showCheck
            onPress={() => setChosen(index)}
          />
        ))}
      </ScrollView>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  prompt: {
    textAlign: "center",
    color: BRAND.muted,
    fontSize: 15,
    fontWeight: "600",
  },
  sentence: {
    marginTop: 10,
    marginBottom: 22,
    textAlign: "center",
    color: BRAND.text,
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 36,
  },
  options: { paddingBottom: 16 },
});
