import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import {
  ContinueButton,
  OnboardingChrome,
} from "../../src/components/onboarding/OnboardingChrome";
import { BRAND, DAILY_MINUTES } from "../../src/constants/onboarding";
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../../src/lib/onboardingProfile";

/**
 * Daily practice duration with simple growth chart.
 */
export default function DailyScreen() {
  const [dailyMinutes, setDailyMinutes] = useState<number | null>(15);

  useEffect(() => {
    void loadOnboardingProfile().then((p) => {
      if (typeof p.dailyMinutes === "number") setDailyMinutes(p.dailyMinutes);
    });
  }, []);

  async function handleContinue() {
    if (dailyMinutes === null) return;
    await saveOnboardingProfile({ dailyMinutes });
    router.push("/onboarding/schedule");
  }

  return (
    <OnboardingChrome
      section="BUILD YOUR PLAN"
      step={3}
      totalSteps={5}
      title="How long should we practice together daily?"
      footer={
        <ContinueButton
          disabled={dailyMinutes === null}
          onPress={() => {
            void handleContinue();
          }}
        />
      }
    >
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Learning Growth</Text>
        <Svg width="100%" height={120} viewBox="0 0 320 120">
          <Path
            d="M10 100 C 70 95, 110 80, 150 55 C 190 30, 240 18, 300 12"
            stroke={BRAND.blueMuted}
            strokeWidth={2}
            fill="none"
            strokeDasharray="6 6"
          />
          <Path
            d="M10 105 C 80 100, 130 85, 170 55 C 210 28, 250 16, 300 10"
            stroke={BRAND.blue}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
          <Circle cx={300} cy={10} r={7} fill={BRAND.blue} />
        </Svg>
        <View style={styles.axis}>
          <Text style={styles.axisText}>Day 1</Text>
          <Text style={styles.axisText}>6 Months</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {DAILY_MINUTES.map((mins) => {
          const selected = dailyMinutes === mins;
          return (
            <Pressable
              key={mins}
              onPress={() => setDailyMinutes(mins)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {mins} min
              </Text>
            </Pressable>
          );
        })}
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
    marginBottom: 18,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: BRAND.muted,
    marginBottom: 8,
  },
  axis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  axisText: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    width: "31%",
    flexGrow: 1,
    minWidth: "30%",
    borderWidth: 1.5,
    borderColor: BRAND.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  chipSelected: {
    borderColor: BRAND.blue,
    backgroundColor: BRAND.blueSoft,
  },
  chipText: { fontSize: 15, fontWeight: "800", color: BRAND.text },
  chipTextSelected: { color: BRAND.blue },
});
