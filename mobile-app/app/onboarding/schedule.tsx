import { router } from "expo-router";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import {
  ContinueButton,
  OnboardingChrome,
} from "../../src/components/onboarding/OnboardingChrome";
import { BRAND } from "../../src/constants/onboarding";
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../../src/lib/onboardingProfile";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function Stepper({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        style={styles.stepBtn}
        onPress={() => onChange((value + 1) % (max + 1))}
        accessibilityLabel="Increase"
      >
        <ChevronUp color={BRAND.muted} size={22} />
      </Pressable>
      <View style={styles.stepValue}>
        <Text style={styles.stepText}>{pad(value)}</Text>
      </View>
      <Pressable
        style={styles.stepBtn}
        onPress={() => onChange((value - 1 + max + 1) % (max + 1))}
        accessibilityLabel="Decrease"
      >
        <ChevronDown color={BRAND.muted} size={22} />
      </Pressable>
    </View>
  );
}

/**
 * Preferred practice time + notification prompt.
 */
export default function ScheduleScreen() {
  const [hour, setHour] = useState(19);
  const [minute, setMinute] = useState(30);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    void loadOnboardingProfile().then((p) => {
      if (typeof p.practiceHour === "number") setHour(p.practiceHour);
      if (typeof p.practiceMinute === "number") setMinute(p.practiceMinute);
    });
  }, []);

  const timeLabel = useMemo(() => `${pad(hour)}:${pad(minute)}`, [hour, minute]);

  async function persist(notificationsEnabled: boolean) {
    await saveOnboardingProfile({
      practiceHour: hour,
      practiceMinute: minute,
      notificationsEnabled,
    });
    setShowNotif(false);
    router.push("/onboarding/plan-ready");
  }

  async function handleContinue() {
    await saveOnboardingProfile({
      practiceHour: hour,
      practiceMinute: minute,
    });
    setShowNotif(true);
  }

  return (
    <>
      <OnboardingChrome
        section="BUILD YOUR PLAN"
        step={4}
        totalSteps={5}
        title="When do you prefer to practice?"
        subtitle="Help us schedule practice around your daily routine"
        footer={
          <ContinueButton
            onPress={() => {
              void handleContinue();
            }}
          />
        }
      >
        <Text style={styles.timePreview}>{timeLabel}</Text>
        <View style={styles.pickerRow}>
          <Stepper value={hour} max={23} onChange={setHour} />
          <Text style={styles.colon}>:</Text>
          <Stepper value={minute} max={59} onChange={setMinute} />
        </View>
      </OnboardingChrome>

      <Modal visible={showNotif} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🐰⏰</Text>
            <Text style={styles.modalTitle}>
              Want me to remind you when to study?
            </Text>
            <Text style={styles.modalBody}>
              Allow us to send you gentle reminders for your scheduled sessions.
            </Text>
            <Pressable
              style={styles.allowBtn}
              onPress={() => {
                void persist(true);
              }}
            >
              <Text style={styles.allowText}>Allow Notifications</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void persist(false);
              }}
            >
              <Text style={styles.notNow}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  timePreview: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: BRAND.muted,
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  colon: {
    fontSize: 28,
    fontWeight: "800",
    color: BRAND.text,
    marginHorizontal: 8,
  },
  stepper: { alignItems: "center", width: 96 },
  stepBtn: {
    width: 48,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: {
    width: 88,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    fontSize: 28,
    fontWeight: "800",
    color: BRAND.text,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
    alignItems: "center",
  },
  modalEmoji: { fontSize: 42, marginBottom: 12 },
  modalTitle: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: BRAND.text,
    marginBottom: 10,
  },
  modalBody: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    color: BRAND.muted,
    marginBottom: 22,
  },
  allowBtn: {
    width: "100%",
    backgroundColor: BRAND.blue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  allowText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  notNow: { color: BRAND.blue, fontSize: 15, fontWeight: "700" },
});
