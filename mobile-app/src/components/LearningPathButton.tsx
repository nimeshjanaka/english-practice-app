import { Map } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

type Props = {
  /** When true, show a labeled Path button instead of only the map icon. */
  labeled?: boolean;
};

/** Always return to the Learning Path tab (unit trail). */
export function goToLearningPath() {
  router.replace("/(tabs)");
}

/**
 * Header control used on exercise / speaking screens to jump back to the path.
 */
export function LearningPathButton({ labeled = false }: Props) {
  return (
    <Pressable
      onPress={goToLearningPath}
      style={[styles.btn, labeled && styles.btnLabeled]}
      accessibilityLabel="Back to learning path"
      hitSlop={8}
    >
      <Map color="#2563EB" size={labeled ? 16 : 18} strokeWidth={2.4} />
      {labeled ? <Text style={styles.label}>Path</Text> : null}
    </Pressable>
  );
}

/** Spacer matching the path button width so titles stay centered. */
export function LearningPathButtonSpacer() {
  return <View style={styles.btn} />;
}

const styles = StyleSheet.create({
  btn: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
  },
  btnLabeled: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  label: {
    color: "#2563EB",
    fontWeight: "800",
    fontSize: 13,
  },
});
