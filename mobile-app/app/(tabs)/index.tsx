import { router } from "expo-router";
import { Check } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import api, { axios } from "../../src/api";
import { COURSES_PATH } from "../../src/constants/api";

type PathLesson = {
  id: number;
  title: string;
  icon_name: string;
  order_index: number;
  is_completed: boolean;
};

type CoursePath = {
  id: number;
  title: string;
  order_index: number;
  lessons: PathLesson[];
};

type LessonStatus = "completed" | "current" | "locked";

type DrawnLesson = PathLesson & { status: LessonStatus };

function statusFor(lessons: PathLesson[]): DrawnLesson[] {
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

function ZigzagLink({ toRight }: { toRight: boolean }) {
  const d = toRight ? "M28 4 C 70 4, 110 40, 152 40" : "M152 4 C 110 4, 70 40, 28 40";
  return (
    <Svg width={180} height={44} style={styles.link}>
      <Path d={d} stroke="#D5D8E2" strokeWidth={3} strokeDasharray="6 7" fill="none" />
    </Svg>
  );
}

/**
 * Vertical zig-zag path. Lessons come from GET /api/v1/courses.
 */
export default function LearningPathScreen() {
  const insets = useSafeAreaInsets();
  const [courses, setCourses] = useState<CoursePath[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setError(null);
    try {
      const response = await api.get<CoursePath[]>(COURSES_PATH);
      setCourses(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) return;
      setError("Could not load your path. Pull to refresh.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const lessons = useMemo(() => {
    const flat = [...courses]
      .sort((a, b) => a.order_index - b.order_index || a.id - b.id)
      .flatMap((course) =>
        [...(course.lessons ?? [])].sort((a, b) => a.order_index - b.order_index || a.id - b.id),
      );
    return statusFor(flat);
  }, [courses]);

  const courseTitle = courses[0]?.title ?? "Learning path";

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#3B82F6" />
      </View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(420)} style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24 }]}
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
        <Text style={styles.heading}>{courseTitle}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {lessons.length === 0 && !error ? (
          <Text style={styles.empty}>No published lessons on this course yet.</Text>
        ) : null}

        {lessons.map((lesson, index) => {
          const onLeft = index % 2 === 0;
          const open = lesson.status !== "locked";
          return (
            <Animated.View key={lesson.id} entering={FadeInDown.delay(index * 70).duration(480)}>
              <View style={[styles.step, onLeft ? styles.stepLeft : styles.stepRight]}>
                {!onLeft ? (
                  <Text style={[styles.label, lesson.status === "locked" && styles.labelLocked]}>{lesson.title}</Text>
                ) : null}
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
                {onLeft ? (
                  <Text style={[styles.label, lesson.status === "locked" && styles.labelLocked]}>{lesson.title}</Text>
                ) : null}
              </View>
              {index < lessons.length - 1 ? <ZigzagLink toRight={onLeft} /> : null}
            </Animated.View>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6FF" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F6FF" },
  scroll: { paddingHorizontal: 28, paddingBottom: 96 },
  heading: { fontSize: 22, fontWeight: "800", color: "#1F2937", marginBottom: 28 },
  error: { color: "#DC2626", marginBottom: 16 },
  empty: { color: "#94A3B8", marginTop: 24 },
  step: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 72 },
  stepLeft: { justifyContent: "flex-start", paddingLeft: 12 },
  stepRight: { justifyContent: "flex-end", paddingRight: 12 },
  node: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  nodeDone: { backgroundColor: "#22C55E" },
  nodeCurrent: { backgroundColor: "#3B82F6", borderWidth: 4, borderColor: "#BFDBFE" },
  nodeLocked: { backgroundColor: "#F3C3C8" },
  label: { fontSize: 17, fontWeight: "800", color: "#1F2937", maxWidth: 150 },
  labelLocked: { color: "#C5CAD3" },
  link: { alignSelf: "center", marginVertical: 2 },
});
