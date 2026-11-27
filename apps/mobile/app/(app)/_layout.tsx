import * as React from "react";
import { Redirect, Tabs } from "expo-router";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "@/lib/auth";
import { registerForPushNotifications } from "@/lib/notifications";
import { Loader } from "@/components/ui";
import { OfflineBanner } from "@/components/offline-banner";
import { theme } from "@/lib/theme";

function Icon({ name, color }: { name: "home" | "trophy" | "matches" | "leaderboard" | "profile"; color: string }) {
  const paths: Record<typeof name, string> = {
    home: "M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z",
    trophy: "M6 4h12v4a6 6 0 0 1-12 0V4Zm0 1H3v2a3 3 0 0 0 3 3m12-5h3v2a3 3 0 0 1-3 3m-6 3v4m-3 3h6",
    matches: "M4 6h16M4 12h10M4 18h7",
    leaderboard: "M4 20V10m5 10V4m5 16v-7m5 7V8",
    profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0",
  };
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d={paths[name]} stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function AppLayout() {
  const { ready, session, user } = useAuth();

  React.useEffect(() => {
    if (user) void registerForPushNotifications(user.id);
  }, [user]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <Loader />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/sign-in" />;

  return (
    <>
      <OfflineBanner />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.bg },
          headerTitleStyle: { color: "#fff", fontSize: 12, fontWeight: "800" },
          headerShadowVisible: false,
          headerTintColor: theme.colors.blue,
          tabBarStyle: {
            backgroundColor: "rgba(8,8,14,0.98)",
            borderTopColor: "rgba(255,255,255,0.07)",
            borderTopWidth: 1,
            height: 62,
            paddingTop: 6,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: theme.colors.blue,
          tabBarInactiveTintColor: "rgba(255,255,255,0.35)",
          tabBarLabelStyle: { fontSize: 9, fontWeight: "800" },
          sceneStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            headerTitle: "RJNX GAMING ESPORTS",
            tabBarIcon: ({ color }) => <Icon name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="tournaments"
          options={{ title: "Tournaments", tabBarIcon: ({ color }) => <Icon name="trophy" color={color} /> }}
        />
        <Tabs.Screen
          name="matches"
          options={{ title: "My Matches", tabBarIcon: ({ color }) => <Icon name="matches" color={color} /> }}
        />
        <Tabs.Screen
          name="leaderboard"
          options={{ title: "Leaderboard", tabBarIcon: ({ color }) => <Icon name="leaderboard" color={color} /> }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: "Profile", tabBarIcon: ({ color }) => <Icon name="profile" color={color} /> }}
        />
        <Tabs.Screen name="notifications" options={{ href: null, title: "Notifications" }} />
        <Tabs.Screen name="teams" options={{ href: null, title: "Teams" }} />
        <Tabs.Screen name="settings" options={{ href: null, title: "Settings" }} />
        <Tabs.Screen name="support" options={{ href: null, title: "Support" }} />
      </Tabs>
    </>
  );
}
