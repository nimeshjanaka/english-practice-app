import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { Settings as SettingsIcon, User, Map, LogOut, X } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TOKEN_KEY } from "../constants/api";
import { goToLearningPath } from "./LearningPathButton";

type Props = {
  /** Optional extra actions shown in the sheet. */
  extraActions?: { label: string; onPress: () => void }[];
};

/**
 * Blue settings gear — opens a sheet with Profile, Learning Path, and Logout.
 */
export function SettingsButton({ extraActions = [] }: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  async function logout() {
    setOpen(false);
    await AsyncStorage.removeItem(TOKEN_KEY);
    router.replace("/login");
  }

  function goProfile() {
    setOpen(false);
    router.replace("/(tabs)/profile");
  }

  function goPath() {
    setOpen(false);
    goToLearningPath();
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.gear}
        accessibilityLabel="Open settings"
        hitSlop={8}
      >
        <SettingsIcon color="#FFFFFF" size={20} strokeWidth={2.4} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Settings</Text>
              <Pressable onPress={() => setOpen(false)} style={styles.closeBtn} accessibilityLabel="Close">
                <X color="#64748B" size={20} />
              </Pressable>
            </View>

            <ActionRow
              icon={<User color="#2563EB" size={20} />}
              label="Profile"
              onPress={goProfile}
            />
            <ActionRow
              icon={<Map color="#2563EB" size={20} />}
              label="Learning Path"
              onPress={goPath}
            />
            {extraActions.map((action) => (
              <ActionRow
                key={action.label}
                icon={<SettingsIcon color="#2563EB" size={20} />}
                label={action.label}
                onPress={() => {
                  setOpen(false);
                  action.onPress();
                }}
              />
            ))}
            <ActionRow
              icon={<LogOut color="#B91C1C" size={20} />}
              label="Logout"
              danger
              onPress={() => {
                void logout();
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>{icon}</View>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gear: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 6,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconDanger: {
    backgroundColor: "#FEE2E2",
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  rowLabelDanger: {
    color: "#B91C1C",
  },
});
