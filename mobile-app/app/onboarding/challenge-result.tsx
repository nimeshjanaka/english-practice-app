import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import {
  ContinueButton,
  OnboardingChrome,
} from "../../src/components/onboarding/OnboardingChrome";
import { BRAND, LEVEL_COPY } from "../../src/constants/onboarding";
import { loadOnboardingProfile } from "../../src/lib/onboardingProfile";

const BANDS = ["A0", "A1", "A2", "B1", "B2"] as const;

/**
 * Placement result — estimated starting CEFR level.
 */
export default function ChallengeResultScreen() {
  const [level, setLevel] = useState("A2");

  useEffect(() => {
    void loadOnboardingProfile().then((p) => {
      setLevel(p.testedLevel || p.level || "A2");
    });
  }, []);

  const copy = LEVEL_COPY[level] ?? LEVEL_COPY.A2;
  const levelIndex = Math.max(
    0,
    BANDS.findIndex((b) => b === level),
  );

  const arc = useMemo(() => {
    // Semi-circle gauge from A0..B2
    const start = Math.PI;
    const end = 0;
    const t = levelIndex / (BANDS.length - 1);
    const angle = start + (end - start) * t;
    const cx = 140;
    const cy = 130;
    const r = 100;
    const knobX = cx + r * Math.cos(angle);
    const knobY = cy - r * Math.sin(angle);
    const filledEnd = angle;
    const large = 0;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy - r * Math.sin(start);
    const x2 = cx + r * Math.cos(filledEnd);
    const y2 = cy - r * Math.sin(filledEnd);
    const filledPath = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
    const trackPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
    return { trackPath, filledPath, knobX, knobY, cx, cy };
  }, [levelIndex]);

  return (
    <OnboardingChrome
      section="YOUR CHALLENGES"
      step={3}
      totalSteps={4}
      title="Your starting point"
      footer={
        <ContinueButton onPress={() => router.push("/onboarding/plan-bridge")} />
      }
    >
      <View style={styles.gaugeWrap}>
        <Svg width={280} height={160} viewBox="0 0 280 160">
          <Path
            d={arc.trackPath}
            stroke={BRAND.blueMuted}
            strokeWidth={16}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={arc.filledPath}
            stroke={BRAND.blue}
            strokeWidth={16}
            fill="none"
            strokeLinecap="round"
          />
          <Circle cx={arc.knobX} cy={arc.knobY} r={11} fill={BRAND.blue} />
          <Circle
            cx={arc.knobX}
            cy={arc.knobY}
            r={16}
            fill={BRAND.blue}
            opacity={0.18}
          />
        </Svg>
        <View style={styles.labels}>
          {BANDS.map((b) => (
            <Text key={b} style={[styles.band, b === level && styles.bandActive]}>
              {b}
            </Text>
          ))}
        </View>
        <Text style={styles.resultLabel}>Test Results</Text>
        <Text style={styles.resultLevel}>{level}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Estimated Level:</Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{copy.label}</Text>
        </View>
        <Text style={styles.cardBody}>{copy.description}</Text>
      </View>
    </OnboardingChrome>
  );
}

const styles = StyleSheet.create({
  gaugeWrap: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 12,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "88%",
    marginTop: -8,
    marginBottom: 8,
  },
  band: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
  },
  bandActive: {
    color: BRAND.blue,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: BRAND.muted,
  },
  resultLevel: {
    fontSize: 36,
    fontWeight: "800",
    color: BRAND.blue,
    marginTop: 2,
  },
  card: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 20,
    alignItems: "center",
    shadowColor: BRAND.blue,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardLabel: {
    fontSize: 13,
    color: BRAND.muted,
    fontWeight: "600",
    marginBottom: 8,
  },
  pill: {
    backgroundColor: BRAND.blueSoft,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 12,
  },
  pillText: {
    color: BRAND.blue,
    fontWeight: "800",
    fontSize: 14,
  },
  cardBody: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    color: BRAND.muted,
    fontWeight: "500",
  },
});
