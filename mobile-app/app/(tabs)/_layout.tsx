import { Tabs } from "expo-router";
import { CircleHelp, Map, Theater, User } from "lucide-react-native";

/**
 * Bottom tabs: Learning Path, Role Plays, Profile, Help.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#8A8A8A",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Learning Path",
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="role-plays"
        options={{
          title: "Role Plays",
          headerShown: true,
          tabBarIcon: ({ color, size }) => <Theater color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: true,
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="help"
        options={{
          title: "Help",
          headerShown: true,
          tabBarIcon: ({ color, size }) => <CircleHelp color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
