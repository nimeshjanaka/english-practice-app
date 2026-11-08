import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { Flame, GraduationCap, Mic2, User } from "lucide-react-native";
import { useCallback, useMemo, useState, type ReactNode } from "react";
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
import { AUTH, PROGRESS_OVERVIEW_PATH, TOKEN_KEY } from "../../src/constants/api";

type MeResponse = {
  id: number;
  email: string;
  role?: string;
};

type ProgressOverview = {
  lessons_completed: number;
  total_speaking_seconds: number;
  current_streak: number;
};

type ProfileResponse = {
  name?: string;
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

function formatSpeakingTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rem = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${rem}s`;
  return `${rem}s`;
}

/**
 * Profile tab — overview from GET /api/v1/progress/overview.
 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [lessonsCompleted, setLessonsCompleted] = useState(0);
  const [speakingSeconds, setSpeakingSeconds] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, overviewRes, profileRes] = await Promise.all([
        api.get<MeResponse>(AUTH.me),
        api.get<ProgressOverview>(PROGRESS_OVERVIEW_PATH),
        api.get<ProfileResponse>("/api/v1/users/me/profile").catch(() => null),
      ]);

      setEmail(meRes.data?.email ?? "");
      setName((profileRes?.data?.name || "").trim());
      setLessonsCompleted(overviewRes.data?.lessons_completed ?? 0);
      setSpeakingSeconds(overviewRes.data?.total_speaking_seconds ?? 0);
      setStreak(overviewRes.data?.current_streak ?? 0);
    } catch {
      // Interceptor handles 401; keep last known values otherwise.
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const displayName = useMemo(() => {
    if (name) return name;
    return email ? displayNameFromEmail(email) : "Learner";
  }, [email, name]);

  async function handleLogout() {
    await AsyncStorage.removeItem(TOKEN_KEY);
    router.replace("/login");
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

      {loading ? <ActivityIndicator color="#2563EB" style={{ marginBottom: 16 }} /> : null}

      <Text style={styles.name}>{displayName}</Text>
      <Text style={styles.email}>{email || "Loading email…"}</Text>

      <View style={styles.statsCard}>
        <Text style={styles.statsLabel}>Your progress</Text>
        <View style={styles.statsRow}>
          <StatTile
            icon={<GraduationCap color="#1D4ED8" size={22} />}
            label="Lessons completed"
            value={String(lessonsCompleted)}
          />
          <StatTile
            icon={<Mic2 color="#0F766E" size={22} />}
            label="Speaking time"
            value={formatSpeakingTime(speakingSeconds)}
          />
          <StatTile
            icon={<Flame color="#C2410C" size={22} />}
            label="Current streak"
            value={`${streak} day${streak === 1 ? "" : "s"}`}
          />
        </View>
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

function StatTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statTile}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  statsCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 28,
  },
  statsLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563EB",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 14,
  },
  statsRow: {
    gap: 12,
  },
  statTile: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
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
