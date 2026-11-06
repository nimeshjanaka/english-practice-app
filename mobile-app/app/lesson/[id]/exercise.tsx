import { router, useLocalSearchParams } from "expo-router";
import { Check, ChevronLeft, X } from "lucide-react-native";
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
import { exerciseSubmitPath, lessonExercisesPath } from "../../../src/constants/api";

type Exercise = {
  id: number;
  type: string;
  question_data: Record<string, unknown>;
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

/**
 * Typed exercise player. Grading happens on POST /api/content/exercises/{id}/submit.
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
  const [result, setResult] = useState<SubmitResult | null>(null);

  const exercise = exercises[index];
  const kind = exercise ? kindFor(exercise.type) : "multiple_choice";
  const pairRows = exercise ? asPairs(exercise.question_data.pairs) : [];
  const usesSingleMatch = kind === "matching" && pairRows.length === 0;

  const resetAnswer = useCallback((next: Exercise | undefined) => {
    setChoice(null);
    setBlank("");
    setOrder([]);
    setSelectedLeft(null);
    setResult(null);
    setError(null);
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
    if (!exercise || result) return false;
    if (kind === "fill_blank") return blank.trim().length > 0;
    if (kind === "sentence_ordering") return order.length > 0 && bank.length === 0;
    if (kind === "matching" && pairRows.length > 0) return pairs.every(([, right]) => right !== "");
    return choice !== null;
  }

  async function onSubmit() {
    if (!exercise || !canSubmit()) return;
    setSubmitting(true);
    setError(null);
    const body =
      kind === "sentence_ordering"
        ? { order }
        : kind === "matching" && pairRows.length > 0
          ? { pairs }
          : { answer: kind === "fill_blank" ? blank.trim() : choice };
    try {
      const response = await api.post<SubmitResult>(exerciseSubmitPath(exercise.id), body);
      setResult(response.data);
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
    if (result) return;
    setBank((current) => current.filter((_, itemIndex) => itemIndex !== tokenIndex));
    setOrder((current) => [...current, token]);
  }

  function returnToken(token: string, tokenIndex: number) {
    if (result) return;
    setOrder((current) => current.filter((_, itemIndex) => itemIndex !== tokenIndex));
    setBank((current) => [...current, token]);
  }

  const options = exercise ? asStrings(exercise.question_data.options ?? exercise.question_data.choices) : [];
  const rights = pairRows.map(([, right]) => right);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
          <ChevronLeft color="#0F172A" size={22} strokeWidth={2.6} />
        </Pressable>
        <Text style={styles.navTitle}>Exercise</Text>
        <Text style={styles.count}>{exercises.length ? `${index + 1}/${exercises.length}` : ""}</Text>
      </View>

      {loading ? <ActivityIndicator color="#3B82F6" style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && exercise ? (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.prompt}>{promptFor(exercise, usesSingleMatch ? "multiple_choice" : kind)}</Text>

          {kind === "multiple_choice" || usesSingleMatch ? (
            <View style={styles.stack}>
              {options.map((option) => {
                const selected = choice === option;
                return (
                  <Pressable
                    key={option}
                    disabled={result !== null}
                    onPress={() => setChoice(option)}
                    style={[styles.choice, selected && styles.choiceSelected]}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]} />
                    <Text style={styles.choiceText}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {kind === "fill_blank" ? (
            <TextInput
              style={styles.input}
              value={blank}
              onChangeText={setBlank}
              editable={result === null}
              placeholder="Type the missing word"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : null}

          {kind === "sentence_ordering" ? (
            <View>
              <View style={styles.tokenRow}>
                {order.length === 0 ? <Text style={styles.hint}>Tap the words in order.</Text> : null}
                {order.map((token, tokenIndex) => (
                  <Pressable key={`${token}-${tokenIndex}`} onPress={() => returnToken(token, tokenIndex)} style={styles.token}>
                    <Text style={styles.tokenText}>{token}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.tokenRow}>
                {bank.map((token, tokenIndex) => (
                  <Pressable key={`${token}-${tokenIndex}`} onPress={() => takeToken(token, tokenIndex)} style={styles.tokenIdle}>
                    <Text style={styles.tokenText}>{token}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {kind === "matching" && pairRows.length > 0 ? (
            <View style={styles.stack}>
              {pairs.map(([left, right]) => (
                <Pressable
                  key={left}
                  disabled={result !== null}
                  onPress={() => setSelectedLeft(left)}
                  style={[styles.choice, selectedLeft === left && styles.choiceSelected]}
                >
                  <Text style={styles.choiceText}>
                    {left}
                    {right ? `  →  ${right}` : ""}
                  </Text>
                </Pressable>
              ))}
              <Text style={styles.hint}>Choose a phrase, then its match.</Text>
              <View style={styles.tokenRow}>
                {rights.map((right) => (
                  <Pressable
                    key={right}
                    disabled={!selectedLeft || result !== null}
                    onPress={() => {
                      if (!selectedLeft) return;
                      setPairs((current) => current.map(([left, existing]) => [left, left === selectedLeft ? right : existing]));
                      setSelectedLeft(null);
                    }}
                    style={styles.tokenIdle}
                  >
                    <Text style={styles.tokenText}>{right}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {result ? (
            <View style={[styles.result, result.is_correct ? styles.resultRight : styles.resultWrong]}>
              <View style={[styles.resultIcon, result.is_correct ? styles.iconRight : styles.iconWrong]}>
                {result.is_correct ? (
                  <Check color="#FFFFFF" size={16} strokeWidth={3} />
                ) : (
                  <X color="#FFFFFF" size={16} strokeWidth={3} />
                )}
              </View>
              <View style={styles.resultCopy}>
                <Text style={styles.resultTitle}>{result.is_correct ? "Correct" : "Not quite"}</Text>
                <Text style={styles.explanation}>{result.explanation}</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      ) : null}

      {!loading && !exercise && !error ? <Text style={styles.empty}>No exercises found for this lesson.</Text> : null}

      <View style={styles.footer}>
        {result ? (
          <Pressable style={styles.primary} onPress={onContinue}>
            <Text style={styles.primaryText}>{index + 1 < exercises.length ? "Continue" : "Practice speaking"}</Text>
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
  nav: { height: 52, flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  navTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "800", color: "#0F172A" },
  count: { width: 40, textAlign: "right", color: "#94A3B8", fontWeight: "700" },
  loader: { marginTop: 24 },
  error: { color: "#DC2626", marginHorizontal: 20, marginTop: 8 },
  empty: { margin: 24, textAlign: "center", color: "#64748B" },
  body: { paddingHorizontal: 20, paddingBottom: 24 },
  prompt: { fontSize: 22, fontWeight: "800", color: "#0F172A", lineHeight: 30, marginTop: 12, marginBottom: 20 },
  stack: { gap: 10 },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  choiceSelected: { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#CBD5E1" },
  radioSelected: { borderColor: "#3B82F6", backgroundColor: "#3B82F6" },
  choiceText: { flex: 1, fontSize: 16, fontWeight: "600", color: "#0F172A" },
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
  tokenRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, minHeight: 48, marginBottom: 16 },
  token: { backgroundColor: "#DBEAFE", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  tokenIdle: { backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: 10 },
  tokenText: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  hint: { color: "#94A3B8", fontWeight: "600" },
  result: { marginTop: 20, borderRadius: 14, padding: 14, flexDirection: "row", gap: 12 },
  resultRight: { backgroundColor: "#DCFCE7" },
  resultWrong: { backgroundColor: "#FEE2E2" },
  resultIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  iconRight: { backgroundColor: "#22C55E" },
  iconWrong: { backgroundColor: "#EF4444" },
  resultCopy: { flex: 1 },
  resultTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  explanation: { marginTop: 4, color: "#334155", lineHeight: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  primary: { backgroundColor: "#0EA5E9", borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  primaryDisabled: { opacity: 0.45 },
  primaryText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
});
