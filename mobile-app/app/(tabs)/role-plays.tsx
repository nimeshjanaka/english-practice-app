import { router } from "expo-router";
import {
  Image,
  type ImageSourcePropType,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type RolePlay = {
  id: number;
  title: string;
  description: string;
  image: ImageSourcePropType;
};

/** Practice scenarios for the Role Plays tab. */
const ROLE_PLAYS: RolePlay[] = [
  {
    id: 1,
    title: "Ordering Coffee",
    description:
      "Practice ordering a drink, asking for sizes, and chatting with a barista.",
    image: require("../../assets/role-plays/coffee.jpg"),
  },
  {
    id: 2,
    title: "At the Airport",
    description:
      "Check in for a flight, ask about gates, and handle common travel questions.",
    image: require("../../assets/role-plays/airport.jpg"),
  },
  {
    id: 3,
    title: "Meeting a Friend",
    description:
      "Greet someone, make small talk, and arrange plans in natural spoken English.",
    image: require("../../assets/role-plays/friend.jpg"),
  },
];

/**
 * Role Plays tab — 3 scenario cards with Start Chat.
 */
export default function RolePlaysScreen() {
  const insets = useSafeAreaInsets();

  function startChat(rolePlay: RolePlay) {
    router.push({
      pathname: "/lesson/ai-chat",
      params: { lessonId: String(rolePlay.id) },
    });
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
      <Text style={styles.heading}>Role Plays</Text>
      <Text style={styles.subheading}>
        Pick a scenario and start a practice chat with the AI tutor.
      </Text>

      {ROLE_PLAYS.map((rolePlay) => (
        <View key={rolePlay.id} style={styles.card}>
          <Image
            source={rolePlay.image}
            style={styles.cardImage}
            resizeMode="cover"
            accessibilityLabel={`${rolePlay.title} scene`}
          />
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{rolePlay.title}</Text>
            <Text style={styles.cardDescription}>{rolePlay.description}</Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => startChat(rolePlay)}
              activeOpacity={0.85}
            >
              <Text style={styles.startButtonText}>Start Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
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
    paddingTop: 20,
    gap: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E3A8A",
    marginBottom: 4,
  },
  subheading: {
    fontSize: 15,
    color: "#64748B",
    marginBottom: 8,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: 140,
    backgroundColor: "#DBEAFE",
  },
  cardBody: {
    padding: 18,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E3A8A",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 21,
    marginBottom: 16,
  },
  startButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
