import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Star } from "lucide-react-native";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { ContinueButton } from "../../src/components/onboarding/OnboardingChrome";
import { BRAND } from "../../src/constants/onboarding";
import { markOnboardingSeen } from "../../src/lib/onboardingProfile";

const COLLAGE = require("../../assets/images/welcome-collage.jpg");
const AI_TUTOR = require("../../assets/images/ai-tutor-robot.png");

function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <Svg
      width={26}
      height={48}
      viewBox="0 0 28 52"
      style={flip ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      <Path
        d="M14 50 C6 42 2 32 4 22 C6 14 10 8 14 2 C14 10 12 18 12 26 C12 34 13 42 14 50 Z"
        fill="#94A3B8"
        opacity={0.55}
      />
      <Path
        d="M14 46 C8 40 5 33 6 26 C7 20 10 15 14 10"
        stroke="#64748B"
        strokeWidth={1.4}
        fill="none"
        opacity={0.7}
      />
    </Svg>
  );
}

/**
 * Login / Signup choice — lifestyle collage + trust badges.
 */
export default function WelcomeChoiceScreen() {
  const insets = useSafeAreaInsets();

  async function handleLogin() {
    await markOnboardingSeen();
    router.replace("/login");
  }

  return (
    <View style={styles.flex}>
      <View style={styles.collageWrap}>
        <Image source={COLLAGE} style={styles.collage} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.85)", "#FFFFFF"]}
          locations={[0, 0.55, 1]}
          style={styles.fade}
        />
      </View>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 8 },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline}>Chat Anytime, Anywhere You Want</Text>
        <Text style={styles.sub}>Zero pressure. Pure practice and enjoyment.</Text>

        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <View style={styles.robotRow}>
          <Image source={AI_TUTOR} style={styles.robot} resizeMode="contain" />
        </View>

        <View style={styles.badges}>
          <View style={styles.badgeBlock}>
            <Laurel />
            <View style={styles.badgeInner}>
              <View style={styles.stars}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={12} color="#F59E0B" fill="#F59E0B" strokeWidth={0} />
                ))}
              </View>
              <Text style={styles.badgeTitle}>Trusted AI-Tutor App</Text>
            </View>
            <Laurel flip />
          </View>
          <View style={styles.badgeBlock}>
            <Laurel />
            <View style={styles.badgeInner}>
              <Text style={styles.badgeYear}>2026</Text>
              <Text style={styles.badgeTitle}>Essential English{"\n"}Learning App</Text>
            </View>
            <Laurel flip />
          </View>
        </View>

        <ContinueButton onPress={() => router.push("/onboarding/about")} />

        <Text style={styles.loginRow}>
          Already have an account?{" "}
          <Text
            style={styles.loginLink}
            onPress={() => {
              void handleLogin();
            }}
          >
            Log In
          </Text>
        </Text>

        <Text style={styles.legal}>
          By continuing to use the app, you agree to our{" "}
          <Text style={styles.legalLink}>Terms of Service</Text> &{" "}
          <Text style={styles.legalLink}>Privacy Policy</Text>.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#FFFFFF" },
  collageWrap: {
    height: "38%",
    minHeight: 240,
    overflow: "hidden",
  },
  collage: {
    width: "100%",
    height: "100%",
  },
  fade: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    flex: 1,
    marginTop: -28,
  },
  content: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  headline: {
    textAlign: "center",
    fontSize: 26,
    fontWeight: "800",
    color: BRAND.text,
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  sub: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    color: BRAND.muted,
    fontWeight: "500",
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
    marginBottom: 8,
  },
  dot: {
    width: 18,
    height: 5,
    borderRadius: 999,
    backgroundColor: BRAND.blueMuted,
  },
  dotActive: {
    backgroundColor: BRAND.blue,
    width: 28,
  },
  robotRow: {
    height: 88,
    justifyContent: "center",
    marginBottom: 4,
  },
  robot: { width: 96, height: 96 },
  badges: {
    flexDirection: "row",
    width: "100%",
    gap: 6,
    marginBottom: 18,
  },
  badgeBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeInner: { alignItems: "center", maxWidth: 110, paddingHorizontal: 2 },
  stars: { flexDirection: "row", gap: 1, marginBottom: 4 },
  badgeYear: {
    fontSize: 17,
    fontWeight: "800",
    color: "#F59E0B",
    marginBottom: 2,
  },
  badgeTitle: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    lineHeight: 15,
  },
  loginRow: {
    marginTop: 16,
    fontSize: 14,
    color: BRAND.muted,
    fontWeight: "500",
  },
  loginLink: { color: BRAND.blue, fontWeight: "800" },
  legal: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16,
    color: "#A0A8BA",
  },
  legalLink: { textDecorationLine: "underline", color: BRAND.muted },
});
