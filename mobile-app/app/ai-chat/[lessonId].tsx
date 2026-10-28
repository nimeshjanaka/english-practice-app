import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Legacy route — redirects to the lesson AI chat screen.
 */
export default function AiChatRedirect() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  return (
    <Redirect
      href={{
        pathname: "/lesson/ai-chat",
        params: { lessonId: String(lessonId ?? "") },
      }}
    />
  );
}
