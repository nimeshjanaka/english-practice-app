import { Check, Volume2, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export type MatchExerciseData = {
  prompt: string;
  promptValue: string;
  options: string[];
  correct: string;
  counterLabel: string;
  progress: number; // 0..1
};

type DragMatchExerciseProps = {
  data: MatchExerciseData;
  onContinue: () => void;
};

/**
 * Duolingo-style match question: drag (or tap) a word chip into the dashed drop zone,
 * then Submit. Shows Correct + Continue when right.
 */
export function DragMatchExercise({ data, onContinue }: DragMatchExerciseProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    setSelected(null);
    setFeedback(null);
    setDragging(null);
  }, [data.promptValue, data.correct, data.counterLabel]);

  const columns = useMemo(() => {
    const mid = Math.ceil(data.options.length / 2);
    return [data.options.slice(0, mid), data.options.slice(mid)];
  }, [data.options]);

  function clearSelection() {
    if (feedback === "correct") return;
    setSelected(null);
    setFeedback(null);
  }

  function chooseOption(option: string) {
    if (feedback === "correct") return;
    setSelected(option);
    setFeedback(null);
  }

  function handleSubmit() {
    if (!selected || feedback === "correct") return;
    const ok = selected.trim().toLowerCase() === data.correct.trim().toLowerCase();
    setFeedback(ok ? "correct" : "incorrect");
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(data.progress * 100)}%` }]} />
        </View>
      </View>

      <View style={styles.instructionRow}>
        <View style={styles.speakerBtn}>
          <Volume2 color="#64748B" size={18} strokeWidth={2.2} />
        </View>
        <Text style={styles.instruction}>{data.prompt}</Text>
      </View>
      <Text style={styles.counter}>{data.counterLabel}</Text>

      <Text style={styles.promptValue}>{data.promptValue}</Text>

      <View
        style={[
          styles.dropZone,
          selected && styles.dropZoneFilled,
          feedback === "incorrect" && styles.dropZoneWrong,
          feedback === "correct" && styles.dropZoneRight,
        ]}
      >
        {selected ? (
          <>
            <View style={styles.droppedChip}>
              <Text style={styles.droppedChipText}>{selected}</Text>
            </View>
            {feedback !== "correct" ? (
              <Pressable
                onPress={clearSelection}
                style={styles.clearBtn}
                hitSlop={10}
                accessibilityLabel="Clear answer"
              >
                <X color="#FFFFFF" size={14} strokeWidth={3} />
              </Pressable>
            ) : null}
          </>
        ) : (
          <Text style={styles.dropHint}>Drag and drop the correct answer here</Text>
        )}
      </View>

      <View style={styles.optionsRow}>
        {columns.map((col, colIndex) => (
          <View key={`col-${colIndex}`} style={styles.optionCol}>
            {col.map((option) => {
              const used = selected === option;
              return (
                <DraggableOption
                  key={option}
                  label={option}
                  disabled={used || feedback === "correct"}
                  dimmed={used}
                  onTap={() => chooseOption(option)}
                  onDrop={() => chooseOption(option)}
                  onDragStart={() => setDragging(option)}
                  onDragEnd={() => setDragging(null)}
                  isDragging={dragging === option}
                />
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        {feedback === "correct" ? (
          <>
            <View style={styles.correctBanner}>
              <View style={styles.correctIcon}>
                <Check color="#FFFFFF" size={16} strokeWidth={3} />
              </View>
              <Text style={styles.correctText}>Correct</Text>
            </View>
            <Pressable style={styles.continueBtn} onPress={onContinue}>
              <Text style={styles.continueText}>Continue</Text>
            </Pressable>
          </>
        ) : (
          <>
            {feedback === "incorrect" ? (
              <Text style={styles.wrongText}>Not quite — try another word.</Text>
            ) : null}
            <Pressable
              style={[styles.submitBtn, !selected && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={!selected}
            >
              <Text style={styles.submitText}>Submit</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

type DraggableOptionProps = {
  label: string;
  disabled: boolean;
  dimmed: boolean;
  isDragging: boolean;
  onTap: () => void;
  onDrop: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
};

function DraggableOption({
  label,
  disabled,
  dimmed,
  isDragging,
  onTap,
  onDrop,
  onDragStart,
  onDragEnd,
}: DraggableOptionProps) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const z = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
    zIndex: z.value,
  }));

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(() => {
      z.value = 20;
      scale.value = withSpring(1.06);
      runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      // Treat upward drag toward the drop zone as a successful drop
      const droppedUp = e.translationY < -60;
      tx.value = withSpring(0);
      ty.value = withSpring(0);
      scale.value = withSpring(1);
      z.value = 0;
      runOnJS(onDragEnd)();
      if (droppedUp) {
        runOnJS(onDrop)();
      }
    })
    .onFinalize(() => {
      tx.value = withSpring(0);
      ty.value = withSpring(0);
      scale.value = withSpring(1);
      z.value = 0;
      runOnJS(onDragEnd)();
    });

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onEnd(() => {
      runOnJS(onTap)();
    });

  const gesture = Gesture.Exclusive(pan, tap);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.optionChip,
          dimmed && styles.optionChipUsed,
          isDragging && styles.optionChipDragging,
          style,
        ]}
      >
        <Text style={[styles.optionText, dimmed && styles.optionTextUsed]}>{label}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topBar: {
    paddingVertical: 8,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#38BDF8",
    borderRadius: 999,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  speakerBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  instruction: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#64748B",
  },
  counter: {
    marginTop: 6,
    marginLeft: 44,
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
  },
  promptValue: {
    marginTop: 28,
    textAlign: "center",
    fontSize: 56,
    fontWeight: "800",
    color: "#0F172A",
  },
  dropZone: {
    marginTop: 22,
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropZoneFilled: {
    borderStyle: "solid",
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  dropZoneWrong: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  dropZoneRight: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
  },
  dropHint: {
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "500",
  },
  droppedChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  droppedChipText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0F172A",
  },
  clearBtn: {
    position: "absolute",
    top: -10,
    right: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  optionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 22,
    flex: 1,
  },
  optionCol: {
    flex: 1,
    gap: 10,
  },
  optionChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  optionChipUsed: {
    opacity: 0.35,
  },
  optionChipDragging: {
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  optionTextUsed: {
    color: "#64748B",
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  wrongText: {
    textAlign: "center",
    color: "#B91C1C",
    fontWeight: "700",
  },
  submitBtn: {
    backgroundColor: "#0EA5E9",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.45,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  correctBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#DCFCE7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  correctIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  correctText: {
    color: "#15803D",
    fontSize: 18,
    fontWeight: "800",
  },
  continueBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
});
