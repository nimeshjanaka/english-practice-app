import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DragMatchExercise } from "../../src/components/DragMatchExercise";
import api, { axios } from "../../src/api";
import { lessonExercisesPath } from "../../src/constants/api";

type Exercise = {
  id: number;
  lesson_id: number;
  type: string;
  question_data: Record<string, unknown>;
  correct_answer: Record<string, unknown>;
};

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string") return [value];
  return [];
}

function getPrompt(data: Record<string, unknown>): string {
  return String(data.prompt ?? data.question ?? data.instruction ?? "Match the answer");
}

function getPromptValue(data: Record<string, unknown>): string {
  return String(
    data.prompt_value ?? data.target ?? data.display ?? data.number ?? data.promptValue ?? "",
  );
}

function getOptions(data: Record<string, unknown>): string[] {
  return asStringArray(data.options ?? data.choices ?? data.words);
}

function getCorrect(correct: Record<string, unknown>, data: Record<string, unknown>): string {
  if (correct.answer != null) return String(correct.answer);
  if (Array.isArray(correct.answers) && correct.answers.length > 0) {
    return String(correct.answers[0]);
  }
  if (data.answer != null) return String(data.answer);
  return "";
}

/** Build word options for fill-in exercises that only have a blank prompt. */
function fallbackOptions(correct: string): string[] {
  const bank = [
    "this",
    "that",
    "my",
    "your",
    "hello",
    "goodbye",
    "name",
    "am",
    "is",
    "are",
  ];
  const set = new Set<string>([correct.toLowerCase(), ...bank]);
  return Array.from(set)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .slice(0, 10);
}

function toMatchData(exercise: Exercise, index: number, total: number) {
  const data = exercise.question_data;
  const correct = getCorrect(exercise.correct_answer, data);
  let options = getOptions(data);
  if (options.length === 0 && correct) {
    options = fallbackOptions(correct);
  }
  // Ensure correct answer is among options
  if (correct && !options.some((o) => o.toLowerCase() === correct.toLowerCase())) {
    options = [correct, ...options].slice(0, 10);
  }

  const promptValue =
    getPromptValue(data) ||
    (exercise.type.toLowerCase().includes("fill")
      ? getPrompt(data).replace(/_+/g, "_____")
      : getPrompt(data));

  return {
    prompt: getPrompt(data),
    promptValue,
    options,
    correct,
    counterLabel: `${index + 1}/${total}`,
    progress: total <= 1 ? 0.2 : (index + 1) / total,
  };
}

function goToAiChat(lessonId: string) {
  router.push({
    pathname: "/lesson/ai-chat",
    params: { lessonId },
  });
}

/**
 * Lesson exercises — Match-style drag/drop questions (like Match the numbers),
 * then continue to AI KIT chat.
 */
export default function LessonExerciseScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = String(id);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lessonComplete, setLessonComplete] = useState(false);

  const current = exercises[index];
  const matchData = useMemo(() => {
    if (!current || exercises.length === 0) return null;
    return toMatchData(current, index, exercises.length);
  }, [current, exercises.length, index]);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Exercise[]>(lessonExercisesPath(lessonId));
      const list = response.data ?? [];
      setExercises(list);
      setIndex(0);
      setLessonComplete(list.length === 0);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        return;
      }
      setError("Could not load exercises for this lesson.");
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void loadExercises();
  }, [loadExercises]);

  function handleContinue() {
    if (index + 1 < exercises.length) {
      setIndex((value) => value + 1);
    } else {
      setLessonComplete(true);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: `Lesson ${lessonId}` }} />
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <Stack.Screen options={{ title: "Practice", headerShown: true }} />
      <View style={[styles.flex, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {lessonComplete ? (
          <View style={styles.completeCard}>
            <Text style={styles.completeTitle}>Nice work!</Text>
            <Text style={styles.completeBody}>
              You finished the match questions. Next, practice speaking with AI KIT.
            </Text>
            <TouchableOpacity
              style={styles.aiButton}
              onPress={() => goToAiChat(lessonId)}
              activeOpacity={0.85}
            >
              <Text style={styles.aiButtonText}>Next: Talk with AI KIT</Text>
            </TouchableOpacity>
          </View>
        ) : matchData ? (
          <DragMatchExercise data={matchData} onContinue={handleContinue} />
        ) : (
          <View style={styles.completeCard}>
            <Text style={styles.empty}>No exercises found for this lesson.</Text>
            <TouchableOpacity
              style={styles.aiButton}
              onPress={() => goToAiChat(lessonId)}
              activeOpacity={0.85}
            >
              <Text style={styles.aiButtonText}>Next: Talk with AI KIT</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  error: {
    color: "#DC2626",
    marginHorizontal: 16,
    marginTop: 8,
  },
  completeCard: {
    margin: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    alignItems: "center",
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#15803D",
    marginBottom: 8,
  },
  completeBody: {
    fontSize: 15,
    color: "#475569",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  aiButton: {
    backgroundColor: "#0B6E4F",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: "100%",
    alignItems: "center",
  },
  aiButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  empty: {
    textAlign: "center",
    color: "#64748B",
    marginBottom: 20,
    fontSize: 15,
  },
});
