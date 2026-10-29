import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api, { axios } from "../../src/api";
import { UNITS_PATH } from "../../src/constants/api";

type LessonPathItem = {
  id: number;
  unit_id: number;
  title: string;
  icon_name: string;
  order_index: number;
  is_completed: boolean;
};

type UnitWithLessons = {
  id: number;
  title: string;
  order_index: number;
  lessons: LessonPathItem[];
};

type LessonStatus = "completed" | "current" | "locked";
type ZigAlign = "left" | "center" | "right";

type PathLesson = LessonPathItem & {
  status: LessonStatus;
  unitTitle: string;
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const NODE_SIZE = 80;
const SIDE_INSET = SCREEN_WIDTH * 0.1;

/** Zig-zag path: left → right → center → repeat */
function zigAlign(index: number): ZigAlign {
  const pattern: ZigAlign[] = ["left", "right", "center"];
  return pattern[index % 3];
}

function circleColor(status: LessonStatus): string {
  if (status === "completed") return "#22C55E";
  if (status === "current") return "#EAB308";
  return "#9CA3AF";
}

/**
 * Learning Path — real units/lessons from GET /api/content/units,
 * rendered as a Duolingo-style zig-zag of circular lesson buttons.
 */
export default function LearningPathScreen() {
  const insets = useSafeAreaInsets();
  const [units, setUnits] = useState<UnitWithLessons[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUnits = useCallback(async () => {
    setError(null);
    try {
      // Axios instance attaches JWT from AsyncStorage automatically
      const response = await api.get<UnitWithLessons[]>(UNITS_PATH);
      setUnits(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        return;
      }
      setError("Could not load your learning path. Pull to refresh.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  /** Flatten units → lessons and mark completed / current / locked */
  const pathLessons: PathLesson[] = useMemo(() => {
    const flat: PathLesson[] = [];
    const orderedUnits = [...units].sort(
      (a, b) => a.order_index - b.order_index || a.id - b.id,
    );

    for (const unit of orderedUnits) {
      const lessons = [...(unit.lessons ?? [])].sort(
        (a, b) => a.order_index - b.order_index || a.id - b.id,
      );
      for (const lesson of lessons) {
        flat.push({
          ...lesson,
          unitTitle: unit.title,
          status: "locked",
        });
      }
    }

    let currentAssigned = false;
    return flat.map((lesson) => {
      if (lesson.is_completed) {
        return { ...lesson, status: "completed" as const };
      }
      if (!currentAssigned) {
        currentAssigned = true;
        return { ...lesson, status: "current" as const };
      }
      return { ...lesson, status: "locked" as const };
    });
  }, [units]);

  /** Unit title shown in the blue header */
  const headerUnitTitle = useMemo(() => {
    const current = pathLessons.find((lesson) => lesson.status === "current");
    if (current) return current.unitTitle;
    if (pathLessons.length > 0) {
      return pathLessons[pathLessons.length - 1].unitTitle;
    }
    if (units.length > 0) {
      const first = [...units].sort(
        (a, b) => a.order_index - b.order_index || a.id - b.id,
      )[0];
      return first.title;
    }
    return "Your Learning Path";
  }, [pathLessons, units]);

  function onLessonPress(lesson: PathLesson) {
    if (lesson.status === "locked") return;
    router.push(`/lesson/${lesson.id}`);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#1D4ED8", "#3B82F6", "#60A5FA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Text style={styles.headerEyebrow}>Your Learning Path</Text>
        <Text style={styles.headerTitle}>{headerUnitTitle}</Text>
        <Text style={styles.headerMeta}>
          {pathLessons.filter((l) => l.status === "completed").length} of{" "}
          {pathLessons.length} lessons complete
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadUnits();
            }}
            tintColor="#2563EB"
          />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {pathLessons.length === 0 ? (
          <Text style={styles.empty}>
            No lessons yet. Confirm seed data exists, then pull to refresh.
          </Text>
        ) : (
          <View style={styles.pathTrack}>
            {pathLessons.map((lesson, index) => {
              const align = zigAlign(index);
              const isCurrent = lesson.status === "current";
              const isLocked = lesson.status === "locked";

              return (
                <View key={lesson.id} style={styles.pathStep}>
                  {index > 0 ? (
                    <View
                      style={[
                        styles.connector,
                        align === "left" && styles.connectorLeanLeft,
                        align === "right" && styles.connectorLeanRight,
                      ]}
                    />
                  ) : null}

                  <View
                    style={[
                      styles.nodeWrap,
                      align === "left" && styles.nodeLeft,
                      align === "center" && styles.nodeCenter,
                      align === "right" && styles.nodeRight,
                    ]}
                  >
                    {isCurrent ? (
                      <View style={styles.resumeBadge}>
                        <Text style={styles.resumeBadgeText}>Resume</Text>
                        <View style={styles.resumeArrow} />
                      </View>
                    ) : (
                      <View style={styles.resumePlaceholder} />
                    )}

                    <TouchableOpacity
                      activeOpacity={isLocked ? 1 : 0.85}
                      disabled={isLocked}
                      onPress={() => onLessonPress(lesson)}
                      style={[
                        styles.circle,
                        { backgroundColor: circleColor(lesson.status) },
                        isCurrent && styles.circleCurrent,
                        isLocked && styles.circleLocked,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${lesson.title}, ${lesson.status}`}
                    >
                      <Text style={styles.circleIndex}>{index + 1}</Text>
                    </TouchableOpacity>

                    <Text
                      style={[
                        styles.lessonTitle,
                        isLocked && styles.lessonTitleLocked,
                      ]}
                      numberOfLines={2}
                    >
                      {lesson.title}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EFF6FF",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerEyebrow: {
    color: "#DBEAFE",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  headerMeta: {
    marginTop: 8,
    color: "#DBEAFE",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    paddingTop: 28,
    paddingBottom: 64,
    flexGrow: 1,
  },
  error: {
    color: "#DC2626",
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  empty: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 15,
    paddingHorizontal: 24,
    marginTop: 40,
  },
  pathTrack: {
    width: "100%",
    paddingHorizontal: 8,
  },
  pathStep: {
    width: "100%",
    alignItems: "center",
    marginBottom: 4,
  },
  connector: {
    width: 6,
    height: 32,
    borderRadius: 3,
    backgroundColor: "#BFDBFE",
    marginBottom: 4,
  },
  connectorLeanLeft: {
    transform: [{ translateX: -30 }, { rotate: "-16deg" }],
  },
  connectorLeanRight: {
    transform: [{ translateX: 30 }, { rotate: "16deg" }],
  },
  nodeWrap: {
    width: SCREEN_WIDTH * 0.42,
    alignItems: "center",
    marginBottom: 20,
  },
  nodeLeft: {
    alignSelf: "flex-start",
    marginLeft: SIDE_INSET,
  },
  nodeCenter: {
    alignSelf: "center",
  },
  nodeRight: {
    alignSelf: "flex-end",
    marginRight: SIDE_INSET,
  },
  resumeBadge: {
    backgroundColor: "#1E3A8A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    zIndex: 2,
  },
  resumeBadgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  resumeArrow: {
    position: "absolute",
    bottom: -6,
    left: "50%",
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#1E3A8A",
  },
  resumePlaceholder: {
    height: 32,
    marginBottom: 10,
  },
  circle: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5,
    borderColor: "#FFFFFF",
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  circleCurrent: {
    borderColor: "#FEF08A",
    shadowColor: "#CA8A04",
    shadowOpacity: 0.35,
  },
  circleLocked: {
    opacity: 0.7,
  },
  circleIndex: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  lessonTitle: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: "#1E3A8A",
    paddingHorizontal: 4,
    lineHeight: 18,
  },
  lessonTitleLocked: {
    color: "#64748B",
  },
});
