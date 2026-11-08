import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import api, { axios } from "../../src/api";
import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { TOKEN_KEY } from "../../src/constants/api";
import { BRAND, LEARNING_GOALS, TUTORS } from "../../src/constants/onboarding";
import { markOnboardingSeen } from "../../src/lib/onboardingProfile";
import { useOnboarding } from "../../src/state/OnboardingContext";

function labelForGoal(goalId?: string): string {
  if (!goalId) return "Not set yet";
  return LEARNING_GOALS.find((item) => item.id === goalId)?.label ?? goalId;
}

function labelForVoice(voiceId?: string): string {
  if (!voiceId) return "Not set yet";
  return TUTORS.find((item) => item.id === voiceId)?.name ?? voiceId;
}

/**
 * Final onboarding step: send the saved answers to the API, then open the path.
 */
export default function OnboardingCompleteScreen() {
  const { profile, ready } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const level = profile.testedLevel || profile.level || "";

  async function handleFinish() {
    setError(null);
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) {
      await markOnboardingSeen();
      router.replace("/register");
      return;
    }

    setSaving(true);
    try {
      await api.patch("/api/v1/users/me/profile", {
        name: profile.name ?? "",
        level,
        goals: profile.goal ?? "",
        preferred_voice: profile.tutorVoice ?? "",
      });
      await markOnboardingSeen();
      router.replace("/(tabs)");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        await markOnboardingSeen();
        router.replace("/register");
        return;
      }
      setError("Could not save your plan. Check that the API is running, then try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OnboardingLayout
      section="YOUR PLAN"
      step={4}
      totalSteps={5}
      title="You're ready to start"
      subtitle="We'll save your answers, then open your learning path."
      continueLabel={saving ? "Saving…" : "Finish"}
      continueDisabled={!ready || saving}
      onContinue={() => {
        void handleFinish();
      }}
    >
      <View style={styles.card}>
        <Row label="Name" value={profile.name || "Not set yet"} />
        <Row label="Level" value={level || "Not set yet"} />
        <Row label="Goal" value={labelForGoal(profile.goal)} />
        <Row label="Tutor voice" value={labelForVoice(profile.tutorVoice)} />
      </View>
      {saving ? <ActivityIndicator color={BRAND.blue} style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </OnboardingLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BRAND.border,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND.border,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: BRAND.muted,
    marginBottom: 4,
  },
  rowValue: {
    fontSize: 17,
    fontWeight: "800",
    color: BRAND.text,
  },
  loader: { marginTop: 20 },
  error: { marginTop: 16, color: "#DC2626", fontWeight: "600", lineHeight: 20 },
});
