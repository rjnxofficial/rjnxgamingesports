import * as React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { View } from "react-native";
import { AuthProvider } from "@/lib/auth";
import { useNotificationObserver } from "@/lib/notifications";
import { useBrandFonts } from "@/lib/fonts";
import { theme } from "@/lib/theme";

void SplashScreen.preventAutoHideAsync();

function NotificationBridge() {
  const handle = useNotificationObserver();
  React.useEffect(() => handle(), [handle]);
  return null;
}

export default function RootLayout() {
  const [minimumElapsed, setMinimumElapsed] = React.useState(false);
  const { loaded: fontsLoaded, error: fontError } = useBrandFonts();
  const ready = minimumElapsed && (fontsLoaded || Boolean(fontError));

  React.useEffect(() => {
    // Keep the branded splash visible briefly so the arena intro reads clearly.
    const timer = setTimeout(() => setMinimumElapsed(true), 700);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationBridge />
          <StatusBar style="light" backgroundColor={theme.colors.bg} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.colors.bg },
              headerTitleStyle: { color: "#fff", fontSize: 13, fontWeight: "700" },
              headerTintColor: theme.colors.blue,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: theme.colors.bg },
              animation: "fade",
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
            <Stack.Screen name="tournament/[slug]" options={{ title: "TOURNAMENT", headerBackTitle: "Back" }} />
            <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
