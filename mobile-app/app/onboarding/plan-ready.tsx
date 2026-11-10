import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import {
  ContinueButton,
  OnboardingChrome,
} from "../../src/components/onboarding/OnboardingChrome";
import {
  BRAND,
  LEARNING_GOALS,
  type OnboardingProfile,
} from "../../src/constants/onboarding";
import { loadOnboardingProfile } from "../../src/lib/onboardingProfile";

/**
 * Personalized plan summary — growth chart + plan includes.
 */
export default function PlanReadyScreen() {
  const [profile, setProfile] = useState<OnboardingProfile>({});

  useEffect(() => {
    void loadOnboardingProfile().then(setProfile);
  }, []);

  const goalLabel =
    LEARNING_GOALS.find((g) => g.id === profile.goal)?.label ?? "Personal growth";

  return (
    <OnboardingChrome
      section="BUILD YOUR PLAN"
      step={4}
      totalSteps={5}
      title="Your personalized learning plan is ready"
      showBack
      footer={
        <ContinueButton onPress={() => router.push("/onboarding/plan-features")} />
      }
    >
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Learning Growth</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeSmall}>Increase by</Text>
          <Text style={styles.badgeBig}>80%</Text>
        </View>
        <Svg width="100%" height={110} viewBox="0 0 320 110">
          <Path
            d="M10 90 C 90 85, 150 78, 220 70 C 260 66, 290 62, 310 58"
            stroke="#C7D2FE"
            strokeWidth={2.5}
            fill="none"
          />
          <Path
            d="M10 95 C 70 90, 120 70, 170 40 C 210 18, 260 10, 310 8"
            stroke={BRAND.blue}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
          <Circle cx={310} cy={8} r={7} fill={BRAND.blue} />
        </Svg>
        <View style={styles.axis}>
          <Text style={styles.axisText}>Day 1</Text>
          <Text style={styles.axisText}>1 Month</Text>
        </View>
        <Text style={styles.legend}>Other Apps</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statIcon}>🎬</Text>
          <Text style={styles.statNum}>173</Text>
          <Text style={styles.statLabel}>Scene</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statIcon}>💬</Text>
          <Text style={styles.statNum}>49</Text>
          <Text style={styles.statLabel}>Dialogue</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statIcon}>📘</Text>
          <Text style={styles.statNum}>456</Text>
          <Text style={styles.statLabel}>Course</Text>
        </View>
      </View>

      <Text style={styles.includesTitle}>Your Plan Includes</Text>
      <View style={styles.includeCard}>
        <Text style={styles.includeEmoji}>🧑‍💻</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.includeLabel}>Focus</Text>
          <Text style={styles.includeValue}>💪 {goalLabel}</Text>
        </View>
      </View>
    </OnboardingChrome>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 14,
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: BRAND.muted,
    marginBottom: 4,
  },
  badge: { alignSelf: "flex-end", alignItems: "flex-end", marginBottom: 4 },
  badgeSmall: { fontSize: 11, color: BRAND.blue, fontWeight: "600" },
  badgeBig: { fontSize: 22, fontWeight: "800", color: BRAND.blue },
  axis: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  axisText: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  legend: {
    marginTop: 4,
    fontSize: 11,
    color: "#A5B4FC",
    fontWeight: "600",
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    paddingVertical: 14,
    marginBottom: 16,
  },
  stat: { flex: 1, alignItems: "center" },
  divider: { width: 1, height: 40, backgroundColor: BRAND.border },
  statIcon: { fontSize: 16, marginBottom: 2 },
  statNum: { fontSize: 18, fontWeight: "800", color: BRAND.text },
  statLabel: { fontSize: 12, color: BRAND.muted, fontWeight: "600" },
  includesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: BRAND.muted,
    marginBottom: 8,
  },
  includeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
  },
  includeEmoji: { fontSize: 22 },
  includeLabel: { fontSize: 15, fontWeight: "800", color: BRAND.text },
  includeValue: { marginTop: 2, fontSize: 13, color: BRAND.muted, fontWeight: "600" },
});
