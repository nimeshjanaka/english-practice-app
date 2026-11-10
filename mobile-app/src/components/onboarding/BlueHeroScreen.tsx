import type { ReactNode } from "react";
import {
  Image,
  type ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BRAND } from "../../constants/onboarding";
import { ContinueButton, ProgressTrack } from "./OnboardingChrome";

type BlueHeroScreenProps = {
  section: string;
  step?: number;
  totalSteps?: number;
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
  chips?: string[];
  onContinue: () => void;
  footerExtra?: ReactNode;
};

/**
 * Full-bleed blue interstitial used for About You / Goals / Plan bridge.
 */
export function BlueHeroScreen({
  section,
  step = 0,
  totalSteps = 4,
  title,
  subtitle,
  image,
  chips,
  onContinue,
  footerExtra,
}: BlueHeroScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[BRAND.blueDeep, BRAND.blue, BRAND.blueGlow]}
      locations={[0, 0.45, 1]}
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: Math.max(insets.bottom, 16),
        },
      ]}
    >
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      <View style={styles.progressWrap}>
        <Text style={styles.section}>{section}</Text>
        <ProgressTrack step={step} totalSteps={totalSteps} light />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.hero}>
        {chips?.length ? (
          <View style={styles.chips}>
            {chips.map((c) => (
              <View key={c} style={styles.chip}>
                <Text style={styles.chipText}>{c}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Image source={image} style={styles.image} resizeMode="contain" />
      </View>

      {footerExtra}
      <ContinueButton variant="inverse" onPress={onContinue} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  orbTop: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -40,
    right: -50,
  },
  orbBottom: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: 80,
    left: -90,
  },
  progressWrap: {
    alignItems: "center",
    gap: 10,
    marginBottom: 22,
  },
  section: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: "rgba(255,255,255,0.72)",
  },
  title: {
    textAlign: "center",
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.9)",
    paddingHorizontal: 8,
    fontWeight: "500",
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  chipText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  image: {
    width: "100%",
    height: 300,
  },
});
