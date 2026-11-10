import { router } from "expo-router";
import { Check, ChevronLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BRAND } from "../../constants/onboarding";

type OnboardingChromeProps = {
  section: string;
  /** 0-based active step index within this section */
  step: number;
  /** total steps in this section */
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  showBack?: boolean;
};

/**
 * Shared header matching Speakora mocks:
 * circular back, section label, segmented progress with check nodes.
 */
export function OnboardingChrome({
  section,
  step,
  totalSteps,
  title,
  subtitle,
  children,
  footer,
  showBack = true,
}: OnboardingChromeProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: Math.max(insets.top, 10),
          paddingBottom: Math.max(insets.bottom, 14),
        },
      ]}
    >
      <View style={styles.topRow}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft color={BRAND.text} size={22} strokeWidth={2.6} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        <View style={styles.progressWrap}>
          <Text style={styles.section}>{section}</Text>
          <ProgressTrack step={step} totalSteps={totalSteps} />
        </View>

        <View style={styles.backPlaceholder} />
      </View>

      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View style={styles.body}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

/** Segmented bar with completed check circles (design-accurate). */
export function ProgressTrack({
  step,
  totalSteps,
  light = false,
}: {
  step: number;
  totalSteps: number;
  light?: boolean;
}) {
  const active = light ? "#FFFFFF" : BRAND.blue;
  const idle = light ? "rgba(255,255,255,0.28)" : "#E4E8F2";

  return (
    <View style={styles.track}>
      {Array.from({ length: totalSteps }).map((_, i) => {
        const done = i < step;
        const current = i === step;
        const filled = done || current;
        return (
          <View key={i} style={styles.trackSegWrap}>
            <View
              style={[
                styles.trackSeg,
                { backgroundColor: filled ? active : idle },
              ]}
            />
            {done ? (
              <View style={[styles.node, { backgroundColor: active }]}>
                <Check color={light ? BRAND.blue : "#FFFFFF"} size={10} strokeWidth={3} />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

type OptionButtonProps = {
  label: string;
  emoji?: string;
  selected?: boolean;
  showCheck?: boolean;
  onPress: () => void;
};

export function OptionButton({
  label,
  emoji,
  selected,
  showCheck,
  onPress,
}: OptionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.optionPressed,
      ]}
    >
      <View style={styles.optionRow}>
        {emoji ? <Text style={styles.optionEmoji}>{emoji}</Text> : null}
        <Text
          style={[
            styles.optionText,
            emoji || showCheck ? styles.optionTextFlex : null,
            selected && styles.optionTextSelected,
          ]}
        >
          {label}
        </Text>
        {showCheck ? (
          <View style={[styles.check, selected && styles.checkSelected]}>
            {selected ? (
              <Check color="#FFFFFF" size={13} strokeWidth={3} />
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function ContinueButton({
  label = "Continue",
  disabled,
  onPress,
  variant = "primary",
}: {
  label?: string;
  disabled?: boolean;
  onPress: () => void;
  variant?: "primary" | "inverse";
}) {
  const inverse = variant === "inverse";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.continue,
        inverse && styles.continueInverse,
        disabled && (inverse ? styles.continueInverseDisabled : styles.continueDisabled),
        pressed && !disabled && styles.continuePressed,
      ]}
    >
      <Text
        style={[
          styles.continueText,
          inverse && styles.continueTextInverse,
          disabled && styles.continueTextDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BRAND.bg,
    paddingHorizontal: 22,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BRAND.border,
    shadowColor: "#1A1D26",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  backPlaceholder: {
    width: 42,
  },
  progressWrap: {
    flex: 1,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
  },
  section: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: "#A0A8BA",
    textTransform: "uppercase",
  },
  track: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    maxWidth: 210,
    gap: 5,
  },
  trackSegWrap: {
    flex: 1,
    height: 16,
    justifyContent: "center",
    position: "relative",
  },
  trackSeg: {
    height: 4,
    borderRadius: 999,
  },
  node: {
    position: "absolute",
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    fontSize: 25,
    fontWeight: "800",
    color: BRAND.text,
    marginBottom: 8,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    color: BRAND.muted,
    marginBottom: 22,
    paddingHorizontal: 10,
    fontWeight: "500",
  },
  body: {
    flex: 1,
  },
  footer: {
    paddingTop: 10,
  },
  option: {
    borderWidth: 1.5,
    borderColor: BRAND.border,
    backgroundColor: BRAND.card,
    borderRadius: BRAND.radius,
    paddingVertical: 17,
    paddingHorizontal: 18,
    marginBottom: 11,
  },
  optionSelected: {
    borderColor: BRAND.blue,
    backgroundColor: BRAND.blueSoft,
  },
  optionPressed: {
    opacity: 0.92,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  optionEmoji: {
    fontSize: 20,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "700",
    color: BRAND.text,
    letterSpacing: -0.2,
  },
  optionTextFlex: {
    flex: 1,
  },
  optionTextSelected: {
    color: BRAND.blue,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#C9D0E0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkSelected: {
    backgroundColor: BRAND.blue,
    borderColor: BRAND.blue,
  },
  continue: {
    width: "100%",
    backgroundColor: BRAND.blue,
    borderRadius: BRAND.radiusBtn,
    paddingVertical: 17,
    alignItems: "center",
    shadowColor: BRAND.blue,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  continueInverse: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
  },
  continueDisabled: {
    backgroundColor: BRAND.blueMuted,
    shadowOpacity: 0,
  },
  continueInverseDisabled: {
    backgroundColor: "rgba(255,255,255,0.55)",
    shadowOpacity: 0,
  },
  continuePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  continueText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  continueTextInverse: {
    color: BRAND.blue,
  },
  continueTextDisabled: {
    color: "#EEF1FF",
  },
});
