import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { User } from "lucide-react-native";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TOKEN_KEY } from "../../src/constants/api";

/**
 * Profile tab — dummy user info, progress, and logout.
 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

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

      <Text style={styles.name}>John Doe</Text>
      <Text style={styles.email}>john.doe@example.com</Text>

      <View style={styles.progressCard}>
        <Text style={styles.progressLabel}>Your progress</Text>
        <Text style={styles.progressValue}>Lessons Completed: 3</Text>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: "60%" }]} />
        </View>
        <Text style={styles.progressHint}>3 of 5 lessons finished</Text>
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
