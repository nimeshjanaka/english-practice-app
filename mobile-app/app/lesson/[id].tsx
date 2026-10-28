import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  getApiBaseUrl,
  lessonExercisesPath,
  TOKEN_KEY,
} from "../../src/constants/api";

type Exercise = {
  id: number;
  lesson_id: number;
  type: string;
  question_data: Record<string, unknown>;
  correct_answer: Record<string, unknown>;
};

type Feedback = "correct" | "incorrect" | null;
type ExerciseKind = "fill" | "multiple";

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string") return [value];
  return [];
}

function getPrompt(data: Record<string, unknown>): string {
  return String(
    data.prompt ?? data.question ?? data.sentence ?? "Complete the exercise",
  );
}

function getOptions(data: Record<string, unknown>): string[] {
  return asStringArray(data.options ?? data.choices ?? data.words);
}

function getBlankCount(data: Record<string, unknown>): number {
  if (typeof data.blanks === "number" && data.blanks > 0) return data.blanks;
  if (Array.isArray(data.blanks)) return Math.max(data.blanks.length, 1);
  const matches = getPrompt(data).match(/_+/g);
  return matches?.length ? matches.length : 1;
}

function expectedAnswers(correct: Record<string, unknown>): string[] {
  if (Array.isArray(correct.answers)) {
    return correct.answers.map((item) => String(item).trim().toLowerCase());
  }
  if (correct.answer != null) {
    return [String(correct.answer).trim().toLowerCase()];
  }
  return [];
}

function resolveKind(exercise: Exercise): ExerciseKind {
  const type = exercise.type.toLowerCase().replace(/_/g, "-");
  const options = getOptions(exercise.question_data);
  if (
    type.includes("multiple") ||
    type.includes("choice") ||
    type.includes("mcq") ||
    (options.length > 0 && !type.includes("fill") && !type.includes("drag"))
  ) {
    return "multiple";
  }
  return "fill";
}

function goToAiChat(lessonId: string) {
  router.push({
    pathname: "/lesson/ai-chat",
    params: { lessonId },
  });
}

/**
 * Lesson exercise screen — fill-in-the-blank / multiple choice, then AI chat.
 */
export default function LessonExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = String(id);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fillAnswers, setFillAnswers] = useState<string[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [lessonComplete, setLessonComplete] = useState(false);

  const current = exercises[index];
  const kind = current ? resolveKind(current) : "fill";
  const choices = current ? getOptions(current.question_data) : [];

  const loadExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) {
        router.replace("/");
        return;
      }

      const response = await axios.get<Exercise[]>(
        `${getApiBaseUrl()}${lessonExercisesPath(lessonId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const list = response.data ?? [];
      setExercises(list);
      setIndex(0);
      setLessonComplete(list.length === 0);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        await AsyncStorage.removeItem(TOKEN_KEY);
        router.replace("/");
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

  useEffect(() => {
    if (!current) return;
    setFeedback(null);
    setSelectedChoice(null);
    setFillAnswers(Array(getBlankCount(current.question_data)).fill(""));
  }, [current]);

  const progressLabel = useMemo(() => {
    if (exercises.length === 0) return "No exercises";
    return `Exercise ${Math.min(index + 1, exercises.length)} of ${exercises.length}`;
  }, [exercises.length, index]);

  function handleSubmit() {
    if (!current || feedback === "correct") return;

    const expected = expectedAnswers(current.correct_answer);
    const userAnswers =
      kind === "multiple"
        ? selectedChoice
          ? [selectedChoice]
          : []
        : fillAnswers;

    if (userAnswers.length === 0 || userAnswers.every((value) => !value.trim())) {
      setFeedback("incorrect");
      return;
    }

    const ok =
      expected.length > 0 &&
      userAnswers.length === expected.length &&
      userAnswers.every(
        (value, answerIndex) =>
          value.trim().toLowerCase() === expected[answerIndex],
      );

    setFeedback(ok ? "correct" : "incorrect");

    if (ok) {
      setTimeout(() => {
        if (index + 1 < exercises.length) {
          setIndex((value) => value + 1);
        } else {
          setLessonComplete(true);
        }
      }, 700);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: `Lesson ${lessonId}` }} />
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Lesson ${lessonId}`, headerShown: true }} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.progress}>{progressLabel}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {lessonComplete ? (
          <View style={styles.completeCard}>
            <Text style={styles.completeTitle}>Nice work!</Text>
            <Text style={styles.completeBody}>
              You finished the exercises for this lesson. Next, practice speaking
              with the AI tutor.
            </Text>
            <TouchableOpacity
              style={styles.aiButton}
              onPress={() => goToAiChat(lessonId)}
              activeOpacity={0.85}
            >
              <Text style={styles.aiButtonText}>Next: Talk with AI</Text>
            </TouchableOpacity>
          </View>
        ) : current ? (
          <View style={styles.card}>
            <Text style={styles.typeBadge}>
              {kind === "multiple" ? "Multiple choice" : "Fill in the blank"}
            </Text>

            <Text style={styles.prompt}>{getPrompt(current.question_data)}</Text>

            {kind === "fill" ? (
              <View style={styles.inputs}>
                {fillAnswers.map((value, blankIndex) => (
                  <TextInput
                    key={`blank-${blankIndex}`}
                    style={styles.input}
                    value={value}
                    onChangeText={(text) => {
                      setFeedback(null);
                      setFillAnswers((prev) => {
                        const next = [...prev];
                        next[blankIndex] = text;
                        return next;
                      });
                    }}
                    placeholder={
                      fillAnswers.length > 1
                        ? `Blank ${blankIndex + 1}`
                        : "Type your answer"
                    }
                    placeholderTextColor="#93C5FD"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={feedback !== "correct"}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.choiceList}>
                {choices.length === 0 ? (
                  <Text style={styles.hint}>
                    No choices were provided for this question.
                  </Text>
                ) : (
                  choices.map((choice) => {
                    const selected = selectedChoice === choice;
                    return (
                      <TouchableOpacity
                        key={choice}
                        style={[
                          styles.choiceButton,
                          selected && styles.choiceSelected,
                        ]}
                        onPress={() => {
                          if (feedback === "correct") return;
                          setFeedback(null);
                          setSelectedChoice(choice);
                        }}
                        activeOpacity={0.85}
                        disabled={feedback === "correct"}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            selected && styles.choiceTextSelected,
                          ]}
                        >
                          {choice}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {feedback === "correct" ? (
              <Text style={styles.successMsg}>Correct! Great job.</Text>
            ) : null}
            {feedback === "incorrect" ? (
              <Text style={styles.errorMsg}>Not quite — try again.</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.submitButton,
                feedback === "correct" && styles.submitDisabled,
              ]}
              onPress={handleSubmit}
              disabled={feedback === "correct"}
              activeOpacity={0.85}
            >
              <Text style={styles.submitText}>Submit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aiLink}
              onPress={() => goToAiChat(lessonId)}
              activeOpacity={0.85}
            >
              <Text style={styles.aiLinkText}>Next: Talk with AI</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.completeCard}>
            <Text style={styles.empty}>No exercises found for this lesson.</Text>
            <TouchableOpacity
              style={styles.aiButton}
              onPress={() => goToAiChat(lessonId)}
              activeOpacity={0.85}
            >
              <Text style={styles.aiButtonText}>Next: Talk with AI</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#EFF6FF",
    flexGrow: 1,
  },
  progress: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 12,
  },
  prompt: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E3A8A",
    marginBottom: 18,
    lineHeight: 28,
  },
  inputs: {
    gap: 10,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#93C5FD",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0F172A",
  },
  choiceList: {
    gap: 10,
    marginBottom: 8,
  },
  choiceButton: {
    borderWidth: 1.5,
    borderColor: "#93C5FD",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  choiceSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#1D4ED8",
  },
  choiceText: {
    color: "#1E3A8A",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  choiceTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  hint: {
    color: "#94A3B8",
    fontSize: 14,
  },
  successMsg: {
    color: "#15803D",
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    padding: 10,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 4,
    overflow: "hidden",
  },
  errorMsg: {
    color: "#B91C1C",
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    padding: 10,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 4,
    overflow: "hidden",
  },
  submitButton: {
    marginTop: 14,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  aiLink: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 8,
  },
  aiLinkText: {
    color: "#0B6E4F",
    fontSize: 15,
    fontWeight: "700",
  },
  completeCard: {
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
    borderRadius: 10,
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
  error: {
    color: "#DC2626",
    marginBottom: 12,
  },
});
