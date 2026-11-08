import { router } from "expo-router";
import { Check } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line } from "react-native-svg";

import api, { axios } from "../../src/api";
import { COURSES_PATH } from "../../src/constants/api";

type PathLesson = {
  id: number;
  title: string;
  order_index: number;
  is_completed: boolean;
  unit_title?: string;
};

type CoursePath = {
  id: number;
  title: string;
  order_index: number;
  lessons: PathLesson[];
};

type LessonStatus = "completed" | "current" | "locked";

type DrawnLesson = PathLesson & { status: LessonStatus; unitName: string };

function statusFor(lessons: DrawnLesson[]): DrawnLesson[] {
  let opened = false;
  return lessons.map((lesson) => {
    if (lesson.is_completed) return { ...lesson, status: "completed" };
    if (!opened) {
      opened = true;
      return { ...lesson, status: "current" };
    }
    return { ...lesson, status: "locked" };
  });
}

function DashedLink() {
  return (
    <Svg width={4} height={36}>
      <Line x1={2} y1={0} x2={2} y2={36} stroke="#D5D8E2" strokeWidth={3} strokeDasharray="5 7" />
    </Svg>
  );
}

/**
 * Vertical lesson path. Published lessons come from GET /api/v1/courses.
 */
export default function LearningPathScreen() {
  const insets = useSafeAreaInsets();
  const [courses, setCourses] = useState<CoursePath[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pulse = useSharedValue(1);

  const loadCourses = useCallback(async () => {
    setError(null);
    try {
      const response = await api.get<CoursePath[]>(COURSES_PATH);
      setCourses(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) return;
      if (axios.isAxiosError(err) && err.code === "ERR_NETWORK") {
        setError(
          "Cannot reach the API from this device. Check EXPO_PUBLIC_API_URL and that the backend is running, then pull to refresh.",
        );
        return;
      }
      setError("Could not load your path. Pull to refresh.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);

  const currentPulse = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const lessons = useMemo(() => {
    const flat = [...courses]
      .sort((a, b) => a.order_index - b.order_index || a.id - b.id)
      .flatMap((course) =>
        [...(course.lessons ?? [])]
          .sort((a, b) => a.order_index - b.order_index || a.id - b.id)
          .map((lesson) => ({
            ...lesson,
            unitName: lesson.unit_title?.trim() || course.title,
            status: "locked" as LessonStatus,
          })),
      );
    return statusFor(flat);
  }, [courses]);

  const current = lessons.find((lesson) => lesson.status === "current") ?? lessons[lessons.length - 1];
  const unitName = current?.unitName ?? "Learning path";

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.unitLabel}>Unit</Text>
        <Text style={styles.unitName}>{unitName}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadCourses();
            }}
            tintColor="#3B82F6"
          />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {lessons.length === 0 && !error ? (
          <Text style={styles.empty}>No published lessons on this course yet.</Text>
        ) : null}

        {lessons.map((lesson, index) => {
          const open = lesson.status !== "locked";
          const node = (
            <Pressable
              disabled={!open}
              onPress={() => router.push(`/lesson/${lesson.id}/exercise`)}
              style={[
                styles.node,
                lesson.status === "completed" && styles.nodeDone,
                lesson.status === "current" && styles.nodeCurrent,
                lesson.status === "locked" && styles.nodeLocked,
              ]}
              accessibilityLabel={lesson.title}
            >
              {lesson.status === "completed" ? <Check color="#FFFFFF" size={22} strokeWidth={3} /> : null}
            </Pressable>
          );
          return (
            <View key={lesson.id} style={styles.row}>
              <View style={styles.rail}>
                {lesson.status === "current" ? <Animated.View style={currentPulse}>{node}</Animated.View> : node}
                {index < lessons.length - 1 ? <DashedLink /> : null}
              </View>
              <Text style={[styles.title, lesson.status === "locked" && styles.titleLocked]}>{lesson.title}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  unitLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 1, color: "#94A3B8" },
  unitName: { marginTop: 4, fontSize: 24, fontWeight: "800", color: "#111827" },
  scroll: { paddingHorizontal: 28, paddingTop: 28, paddingBottom: 96 },
  error: { color: "#DC2626", marginBottom: 16 },
  empty: { color: "#94A3B8", marginTop: 8 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  rail: { width: 72, alignItems: "center" },
  node: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  nodeDone: { backgroundColor: "#22C55E" },
  nodeCurrent: { backgroundColor: "#3B82F6", borderWidth: 4, borderColor: "#BFDBFE" },
  nodeLocked: { backgroundColor: "#F3C3C8" },
  title: { flex: 1, paddingTop: 18, fontSize: 17, fontWeight: "800", color: "#1F2937" },
  titleLocked: { color: "#C5CAD3" },
});
