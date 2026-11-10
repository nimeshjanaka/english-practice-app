import { router } from "expo-router";
import { Clock3, Mic2 } from "lucide-react-native";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ROLE_PLAYS, ROLE_PLAY_SECONDS } from "../../src/constants/rolePlays";

/**
 * Role Plays tab — 10 timed two-person voice scenarios with topic images.
 */
export default function RolePlaysScreen() {
  const insets = useSafeAreaInsets();
  const minutes = Math.round(ROLE_PLAY_SECONDS / 60);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom, 24) + 16 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Role Plays</Text>
      <Text style={styles.subheading}>
        Two-person voice chat · {minutes} minutes each · hold the mic and speak
      </Text>

      {ROLE_PLAYS.map((rolePlay) => (
        <TouchableOpacity
          key={rolePlay.id}
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: "/role-play/[id]",
              params: { id: rolePlay.id },
            })
          }
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={`Start ${rolePlay.title}`}
        >
          <Image
            source={rolePlay.image}
            style={styles.cardImage}
            resizeMode="cover"
            accessibilityLabel={`${rolePlay.title} scene`}
          />
          <View style={styles.cardBody}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>{rolePlay.title}</Text>
              <View style={styles.timeChip}>
                <Clock3 size={12} color="#64748B" />
                <Text style={styles.timeText}>{minutes}m</Text>
              </View>
            </View>
            <Text style={styles.cardMeta} numberOfLines={1}>
              You · {rolePlay.userRole}  ·  Partner · {rolePlay.partnerRole}
            </Text>
            <Text style={styles.cardDescription} numberOfLines={2}>
              {rolePlay.description}
            </Text>
            <View style={[styles.startChip, { backgroundColor: rolePlay.accent }]}>
              <Mic2 size={14} color="#FFFFFF" />
              <Text style={styles.startText}>Start chat</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
  },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  subheading: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 4,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: 148,
    backgroundColor: "#E2E8F0",
  },
  cardBody: {
    padding: 14,
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  cardMeta: {
    fontSize: 12,
    color: "#64748B",
  },
  cardDescription: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 4,
  },
  startChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 2,
  },
  startText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
