import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { User } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api from "../../src/api";
import { AUTH, TOKEN_KEY, UNITS_PATH } from "../../src/constants/api";

type MeResponse = {
  id: number;
  email: string;
  role?: string;
};

type LessonPathItem = {
  id: number;
  is_completed: boolean;
};

type UnitWithLessons = {
  id: number;
  lessons: LessonPathItem[];
};

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() || "Learner";
  return local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Profile tab — user email, name placeholder, lessons progress, logout.
 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState<string>("");
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, unitsRes] = await Promise.all([
        api.get<MeResponse>(AUTH.me),
        api.get<UnitWithLessons[]>(UNITS_PATH),
      ]);

      setEmail(meRes.data?.email ?? "");

      const lessons = (unitsRes.data ?? []).flatMap((unit) => unit.lessons ?? []);
      setTotal(lessons.length);
      setCompleted(lessons.filter((lesson) => lesson.is_completed).length);
    } catch {
      // Interceptor handles 401; keep placeholders on other errors
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const namePlaceholder = useMemo(
    () => (email ? displayNameFromEmail(email) : "Learner"),
    [email],
  );

  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  async function handleLogout() {
    await AsyncStorage.removeItem(TOKEN_KEY);
    router.replace("/");
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom, 24) + 16 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <User color="#FFFFFF" size={48} strokeWidth={2.2} />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#2563EB" style={{ marginBottom: 16 }} />
      ) : null}

      <Text style={styles.name}>{namePlaceholder}</Text>
      <Text style={styles.email}>{email || "Loading email…"}</Text>

      <View style={styles.progressCard}>
        <Text style={styles.progressLabel}>Your progress</Text>
        <Text style={styles.progressValue}>
          Lessons Completed: {completed}
        </Text>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(100, Math.max(0, progressPercent))}%` },
            ]}
          />
        </View>
        <Text style={styles.progressHint}>
          {total > 0
            ? `${completed} of ${total} lessons finished (${progressPercent}%)`
            : "No lessons yet — start your learning path"}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          void handleLogout();
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EFF6FF",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    alignItems: "center",
  },
  avatarWrap: {
    marginBottom: 16,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E3A8A",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 24,
  },
  progressCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 28,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563EB",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  progressValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E3A8A",
    marginBottom: 14,
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#DBEAFE",
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#22C55E",
  },
  progressHint: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  logoutButton: {
    width: "100%",
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: {
    color: "#B91C1C",
    fontSize: 16,
    fontWeight: "700",
  },
});
