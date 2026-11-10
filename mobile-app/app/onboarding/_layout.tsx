import { Stack } from "expo-router";

/**
 * Speakora onboarding stack — welcome → profile → goals → challenges → plan.
 */
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="about" />
      <Stack.Screen name="name" />
      <Stack.Screen name="age" />
      <Stack.Screen name="gender" />
      <Stack.Screen name="language" />
      <Stack.Screen name="level" />
      <Stack.Screen name="level-test" />
      <Stack.Screen name="goals-intro" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="situations" />
      <Stack.Screen name="focus" />
      <Stack.Screen name="difficulty" />
      <Stack.Screen name="challenge" />
      <Stack.Screen name="challenge-result" />
      <Stack.Screen name="plan-bridge" />
      <Stack.Screen name="voice" />
      <Stack.Screen name="speed" />
      <Stack.Screen name="timeline" />
      <Stack.Screen name="daily" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="plan-ready" />
      <Stack.Screen name="plan-features" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
