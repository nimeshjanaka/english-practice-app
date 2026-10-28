import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

/**
 * Root layout — Stack Navigator for auth screens + main tabs + lesson detail.
 */
export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="lesson/[id]"
          options={{ headerShown: true, title: "Lesson", presentation: "card" }}
        />
        <Stack.Screen
          name="lesson/ai-chat"
          options={{ headerShown: true, title: "Talk with AI", presentation: "card" }}
        />
        <Stack.Screen
          name="ai-chat/[lessonId]"
          options={{ headerShown: true, title: "Talk with AI", presentation: "card" }}
        />
      </Stack>
    </>
  );
}
