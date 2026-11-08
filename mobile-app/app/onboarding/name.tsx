import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from "react-native";

import { OnboardingLayout } from "../../src/components/onboarding/OnboardingLayout";
import { BRAND } from "../../src/constants/onboarding";
import { useOnboarding } from "../../src/state/OnboardingContext";

/** Asks for the name the tutor should use. */
export default function NameScreen() {
  const { profile, update } = useOnboarding();
  const [name, setName] = useState("");

  useEffect(() => {
    if (profile.name) setName(profile.name);
  }, [profile.name]);

  async function handleContinue() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await update({ name: trimmed });
    router.push("/onboarding/age");
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <OnboardingLayout
        section="ABOUT YOU"
        step={0}
        totalSteps={5}
        title="How should we call you?"
        continueDisabled={!name.trim()}
        onContinue={() => {
          void handleContinue();
        }}
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
      </OnboardingLayout>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: BRAND.bg },
  body: { paddingTop: 28 },
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
