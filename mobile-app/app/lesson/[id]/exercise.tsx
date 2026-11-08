import { router, useLocalSearchParams } from "expo-router";
import { Check, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api, { axios } from "../../../src/api";
import { LearningPathButton } from "../../../src/components/LearningPathButton";
import { exerciseAttemptPath, lessonExercisesPath } from "../../../src/constants/api";

const MAX_TRIES = 3;

type Exercise = {
  id: number;
  type: string;
  question_data: Record<string, unknown>;
  correct_answer?: Record<string, unknown>;
};

type SubmitResult = {
  is_correct: boolean;
  explanation: string;
};

type PlayerKind = "multiple_choice" | "fill_blank" | "sentence_ordering" | "matching";

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item));
}

function asPairs(value: unknown): [string, string][] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!Array.isArray(item) || item.length < 2) return [];
    return [[String(item[0]), String(item[1])] as [string, string]];
  });
}

function kindFor(type: string): PlayerKind {
  const name = type.toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
  if (name.includes("fill")) return "fill_blank";
  if (name.includes("order")) return "sentence_ordering";
  if (name.includes("match") || name.includes("drag")) return "matching";
  return "multiple_choice";
}

function promptFor(exercise: Exercise, kind: PlayerKind): string {
  const data = exercise.question_data;
  const text = data.question ?? data.sentence ?? data.prompt ?? data.instruction;
  if (typeof text === "string" && text.trim()) return text;
  if (kind === "sentence_ordering") return "Put the words in the right order.";
  if (kind === "matching") return "Match each pair.";
  return "Choose the correct answer.";
}

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function correctTextAnswer(exercise: Exercise): string {
  const answer = exercise.correct_answer?.answer;
  return typeof answer === "string" ? answer : "";
}

function correctOrder(exercise: Exercise): string[] {
  const raw = exercise.correct_answer?.order ?? exercise.correct_answer?.answer;
  return asStrings(raw);
}

function correctPairs(exercise: Exercise): [string, string][] {
  return asPairs(exercise.correct_answer?.pairs);
}

/**
 * Typed exercise player. Learners get up to 3 tries; then the correct answer is shown.
 */
export default function ExercisePlayerScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lessonId = String(id);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [blank, setBlank] = useState("");
  const [bank, setBank] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [pairs, setPairs] = useState<[string, string][]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<SubmitResult | null>(null);
  const [triesUsed, setTriesUsed] = useState(0);
  const [wrongChoices, setWrongChoices] = useState<string[]>([]);
  const [resolved, setResolved] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const exercise = exercises[index];
  const kind = exercise ? kindFor(exercise.type) : "multiple_choice";
  const pairRows = exercise ? asPairs(exercise.question_data.pairs) : [];
  const usesSingleMatch = kind === "matching" && pairRows.length === 0;
  const triesLeft = Math.max(0, MAX_TRIES - triesUsed);

  const resetAnswer = useCallback((next: Exercise | undefined) => {
    setChoice(null);
    setBlank("");
    setOrder([]);
    setSelectedLeft(null);
    setFeedback(null);
    setError(null);
    setTriesUsed(0);
    setWrongChoices([]);
    setResolved(false);
    setRevealed(false);
    if (!next) {
      setBank([]);
      setPairs([]);
      return;
    }
    const nextKind = kindFor(next.type);
    const tokens = asStrings(next.question_data.tokens ?? next.question_data.words ?? next.question_data.options);
    setBank(nextKind === "sentence_ordering" ? tokens : []);
    const rows = asPairs(next.question_data.pairs);
    setPairs(rows.map(([left]) => [left, ""]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<Exercise[]>(lessonExercisesPath(lessonId));
      const list = response.data ?? [];
      setExercises(list);
      setIndex(0);
      resetAnswer(list[0]);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) return;
      setError("Could not load exercises for this lesson.");
    } finally {
      setLoading(false);
    }
  }, [lessonId, resetAnswer]);

  useEffect(() => {
    void load();
  }, [load]);

  function canSubmit(): boolean {
    if (!exercise || resolved || submitting) return false;
    if (kind === "fill_blank") return blank.trim().length > 0;
    if (kind === "sentence_ordering") return order.length > 0 && bank.length === 0;
    if (kind === "matching" && pairRows.length > 0) return pairs.every(([, right]) => right !== "");
    return choice !== null;
  }

  function clearCurrentAttempt() {
    setChoice(null);
    setBlank("");
    setSelectedLeft(null);
    if (exercise && kind === "sentence_ordering") {
      const tokens = asStrings(
        exercise.question_data.tokens ?? exercise.question_data.words ?? exercise.question_data.options,
      );
      setBank(tokens);
      setOrder([]);
    }
    if (exercise && kind === "matching" && pairRows.length > 0) {
      setPairs(pairRows.map(([left]) => [left, ""]));
    }
  }

  async function onSubmit() {
    if (!exercise || !canSubmit()) return;
    setSubmitting(true);
    setError(null);
    const selectedForMark =
      kind === "fill_blank"
        ? blank.trim()
        : kind === "sentence_ordering"
          ? order.join(" ")
          : choice;
    const body =
      kind === "sentence_ordering"
        ? { order }
        : kind === "matching" && pairRows.length > 0
          ? { pairs }
          : { answer: kind === "fill_blank" ? blank.trim() : choice };
    try {
      const response = await api.post<SubmitResult>(exerciseAttemptPath(exercise.id), body);
      const data = response.data;

      if (data.is_correct) {
        setFeedback(data);
        setResolved(true);
        setRevealed(false);
        return;
      }

      const nextTries = triesUsed + 1;
      setTriesUsed(nextTries);
      if (selectedForMark) {
        setWrongChoices((current) =>
          current.includes(selectedForMark) ? current : [...current, selectedForMark],
        );
      }

      if (nextTries >= MAX_TRIES) {
        setFeedback({
          is_correct: false,
          explanation:
            data.explanation ||
            "That was your third try. The correct answer is highlighted below.",
        });
        setResolved(true);
        setRevealed(true);
        // Show the correct answer values in the inputs where useful.
        if (kind === "fill_blank") {
          setBlank(correctTextAnswer(exercise));
        } else if (kind === "sentence_ordering") {
          const expected = correctOrder(exercise);
          setOrder(expected);
          setBank([]);
        } else if (kind === "matching" && pairRows.length > 0) {
          setPairs(correctPairs(exercise));
        } else {
          const answer = correctTextAnswer(exercise);
          if (answer) setChoice(answer);
        }
        return;
      }

      const left = MAX_TRIES - nextTries;
      setFeedback({
        is_correct: false,
        explanation: `${data.explanation || "Not quite."} Try again — ${left} ${left === 1 ? "try" : "tries"} left.`,
      });
      clearCurrentAttempt();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) return;
      setError("Could not check that answer.");
    } finally {
      setSubmitting(false);
    }
  }

  function onContinue() {
    const nextIndex = index + 1;
    if (nextIndex >= exercises.length) {
      router.push(`/lesson/${lessonId}/speak`);
      return;
    }
    setIndex(nextIndex);
    resetAnswer(exercises[nextIndex]);
  }

  function takeToken(token: string, tokenIndex: number) {
    if (resolved) return;
    setBank((current) => current.filter((_, itemIndex) => itemIndex !== tokenIndex));
    setOrder((current) => [...current, token]);
  }

  function returnToken(token: string, tokenIndex: number) {
    if (resolved) return;
    setOrder((current) => current.filter((_, itemIndex) => itemIndex !== tokenIndex));
    setBank((current) => [...current, token]);
  }

  const options = exercise ? asStrings(exercise.question_data.options ?? exercise.question_data.choices) : [];
  const rights = pairRows.map(([, right]) => right);
  const correctChoice = exercise ? correctTextAnswer(exercise) : "";

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.nav}>
        <LearningPathButton labeled />
        <Text style={styles.navTitle}>Exercise</Text>
        <Text style={styles.count}>{exercises.length ? `${index + 1}/${exercises.length}` : ""}</Text>
      </View>

      {loading ? <ActivityIndicator color="#3B82F6" style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && exercise ? (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.metaRow}>
            <Text style={styles.tries}>
              Tries left: {resolved && feedback?.is_correct ? triesLeft : triesLeft}
            </Text>
          </View>
          <Text style={styles.prompt}>{promptFor(exercise, usesSingleMatch ? "multiple_choice" : kind)}</Text>

          {kind === "multiple_choice" || usesSingleMatch ? (
            <View style={styles.stack}>
              {options.map((option) => {
                const selected = choice === option;
                const wasWrong = wrongChoices.some((item) => norm(item) === norm(option));
                const isCorrectReveal =
                  revealed && correctChoice !== "" && norm(option) === norm(correctChoice);
                return (
                  <Pressable
                    key={option}
                    disabled={resolved}
                    onPress={() => {
                      setChoice(option);
                      setFeedback(null);
                    }}
                    style={[
                      styles.card,
                      selected && !isCorrectReveal && styles.cardSelected,
                      wasWrong && !isCorrectReveal && styles.cardWrong,
                      isCorrectReveal && styles.cardCorrectReveal,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceText,
                        isCorrectReveal && styles.choiceCorrectText,
                        wasWrong && !isCorrectReveal && styles.choiceWrongText,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {kind === "fill_blank" ? (
            <View>
              <TextInput
                style={[
                  styles.input,
                  revealed && styles.inputRevealed,
                  feedback && !feedback.is_correct && !resolved && styles.inputWrong,
                ]}
                value={blank}
                onChangeText={(value) => {
                  setBlank(value);
                  setFeedback(null);
                }}
                editable={!resolved}
                placeholder="Type the missing word"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {revealed && correctChoice ? (
                <Text style={styles.revealHint}>Correct answer: {correctChoice}</Text>
              ) : null}
            </View>
          ) : null}

          {kind === "sentence_ordering" ? (
            <View>
              <View style={[styles.tokenRow, revealed && styles.tokenRowRevealed]}>
                {order.length === 0 ? <Text style={styles.hint}>Tap the words in order.</Text> : null}
                {order.map((token, tokenIndex) => (
                  <Pressable
                    key={`${token}-${tokenIndex}`}
                    onPress={() => returnToken(token, tokenIndex)}
                    style={[styles.token, revealed && styles.tokenRevealed]}
                  >
                    <Text style={styles.tokenText}>{token}</Text>
                  </Pressable>
                ))}
              </View>
              {!resolved ? (
                <View style={styles.tokenRow}>
                  {bank.map((token, tokenIndex) => (
                    <Pressable
                      key={`${token}-${tokenIndex}`}
                      onPress={() => takeToken(token, tokenIndex)}
                      style={styles.tokenIdle}
                    >
                      <Text style={styles.tokenText}>{token}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {revealed ? <Text style={styles.revealHint}>Correct order is highlighted above.</Text> : null}
            </View>
          ) : null}

          {kind === "matching" && pairRows.length > 0 ? (
            <View style={styles.stack}>
              {pairs.map(([left, right]) => (
                <Pressable
                  key={left}
                  disabled={resolved}
                  onPress={() => setSelectedLeft(left)}
                  style={[
                    styles.card,
                    selectedLeft === left && styles.cardSelected,
                    revealed && styles.cardCorrectReveal,
                  ]}
                >
                  <Text style={[styles.choiceText, revealed && styles.choiceCorrectText]}>
                    {left}
                    {right ? `  →  ${right}` : ""}
                  </Text>
                </Pressable>
              ))}
              {!resolved ? (
                <>
                  <Text style={styles.hint}>Choose a phrase, then its match.</Text>
                  <View style={styles.tokenRow}>
                    {rights.map((right) => (
                      <Pressable
                        key={right}
                        disabled={!selectedLeft || resolved}
                        onPress={() => {
                          if (!selectedLeft) return;
                          setPairs((current) =>
                            current.map(([left, existing]) => [
                              left,
                              left === selectedLeft ? right : existing,
                            ]),
                          );
                          setSelectedLeft(null);
                          setFeedback(null);
                        }}
                        style={styles.tokenIdle}
                      >
                        <Text style={styles.tokenText}>{right}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          ) : null}

          {feedback ? (
            <View style={[styles.result, feedback.is_correct ? styles.resultRight : styles.resultWrong]}>
              <View style={[styles.resultIcon, feedback.is_correct ? styles.iconRight : styles.iconWrong]}>
                {feedback.is_correct ? (
                  <Check color="#FFFFFF" size={16} strokeWidth={3} />
                ) : (
                  <X color="#FFFFFF" size={16} strokeWidth={3} />
                )}
              </View>
              <View style={styles.resultCopy}>
                <Text
                  style={[
                    styles.resultTitle,
                    feedback.is_correct ? styles.successText : styles.errorText,
                  ]}
                >
                  {feedback.is_correct
                    ? "Correct"
                    : revealed
                      ? "Out of tries"
                      : "Not quite"}
                </Text>
                <Text style={styles.explanation}>{feedback.explanation}</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      ) : null}

      {!loading && !exercise && !error ? (
        <Text style={styles.empty}>No exercises found for this lesson.</Text>
      ) : null}

      <View style={styles.footer}>
        {resolved ? (
          <Pressable style={styles.primary} onPress={onContinue}>
            <Text style={styles.primaryText}>Next</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.primary, !canSubmit() && styles.primaryDisabled]}
            disabled={!canSubmit() || submitting}
            onPress={() => void onSubmit()}
          >
            <Text style={styles.primaryText}>{submitting ? "Checking…" : "Submit"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  nav: { height: 52, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 8 },
  navTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "800", color: "#0F172A" },
  count: { minWidth: 40, textAlign: "right", color: "#94A3B8", fontWeight: "700" },
  loader: { marginTop: 24 },
  error: { color: "#DC2626", marginHorizontal: 20, marginTop: 8 },
  empty: { margin: 24, textAlign: "center", color: "#64748B" },
  body: { paddingHorizontal: 20, paddingBottom: 24 },
  metaRow: { marginTop: 4, marginBottom: 4 },
  tries: { fontSize: 13, fontWeight: "700", color: "#64748B" },
  prompt: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 30,
    marginTop: 8,
    marginBottom: 20,
  },
  stack: { gap: 10 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  cardSelected: { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
  cardWrong: { borderColor: "#F87171", backgroundColor: "#FEF2F2" },
  cardCorrectReveal: { borderColor: "#F59E0B", backgroundColor: "#FEF3C7" },
  choiceText: { flex: 1, fontSize: 16, fontWeight: "600", color: "#0F172A" },
  choiceWrongText: { color: "#991B1B" },
  choiceCorrectText: { color: "#92400E", fontWeight: "800" },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  inputWrong: { borderColor: "#F87171", backgroundColor: "#FEF2F2" },
  inputRevealed: { borderColor: "#F59E0B", backgroundColor: "#FEF3C7", color: "#92400E" },
  revealHint: {
    marginTop: 10,
    color: "#92400E",
    fontWeight: "700",
    lineHeight: 20,
  },
  tokenRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, minHeight: 48, marginBottom: 16 },
  tokenRowRevealed: {
    backgroundColor: "#FEF3C7",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F59E0B",
    padding: 10,
  },
  token: { backgroundColor: "#DBEAFE", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  tokenRevealed: { backgroundColor: "#FDE68A" },
  tokenIdle: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tokenText: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  hint: { color: "#94A3B8", fontWeight: "600" },
  result: { marginTop: 20, borderRadius: 14, padding: 14, flexDirection: "row", gap: 12 },
  resultRight: { backgroundColor: "#DCFCE7" },
  resultWrong: { backgroundColor: "#FEE2E2" },
  resultIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  iconRight: { backgroundColor: "#22C55E" },
  iconWrong: { backgroundColor: "#EF4444" },
  resultCopy: { flex: 1 },
  resultTitle: { fontSize: 16, fontWeight: "800" },
  successText: { color: "#166534" },
  errorText: { color: "#991B1B" },
  explanation: { marginTop: 4, color: "#334155", lineHeight: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  primary: { backgroundColor: "#0EA5E9", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
});
