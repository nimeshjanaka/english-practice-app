import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import {
  ContinueButton,
  OnboardingChrome,
} from "../../src/components/onboarding/OnboardingChrome";
import { BRAND } from "../../src/constants/onboarding";
import {
  loadOnboardingProfile,
  saveOnboardingProfile,
} from "../../src/lib/onboardingProfile";

/**
 * User details — name.
 */
export default function NameScreen() {
  const [name, setName] = useState("");

  useEffect(() => {
    void loadOnboardingProfile().then((p) => {
      if (p.name) setName(p.name);
    });
  }, []);

  async function handleContinue() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await saveOnboardingProfile({ name: trimmed });
    router.push("/onboarding/age");
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <OnboardingChrome
        section="ABOUT YOU"
        step={0}
        totalSteps={5}
        title="How should we call you?"
        footer={
          <ContinueButton
            disabled={!name.trim()}
            onPress={() => {
              void handleContinue();
            }}
          />
        }
      >
        <View style={styles.body}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name (e.g., John)"
            placeholderTextColor="#94A3B8"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => {
              void handleContinue();
            }}
          />
        </View>
      </OnboardingChrome>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: BRAND.bg },
  body: {
    paddingTop: 28,
  },
  input: {
    borderWidth: 1.5,
    borderColor: BRAND.border,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: "600",
    color: BRAND.text,
    backgroundColor: "#FFFFFF",
  },
});
