import * as React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { StyleSheet, Text, View } from "react-native";
import { AuthProvider } from "@/lib/auth";
import { useNotificationObserver } from "@/lib/notifications";
import { useBrandFonts } from "@/lib/fonts";
import { ErrorBoundary } from "@/components/error-boundary";
import { Logo } from "@/components/logo";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { installGlobalErrorHandlers, log, markBoot } from "@/lib/runtime";
import { theme } from "@/lib/theme";

// Never let a failed splash transition freeze the window: hide the native splash
// after this budget even if fonts/session are still loading.
const SPLASH_HARD_TIMEOUT_MS = 5000;
const FONT_TIMEOUT_MS = 4000;

markBoot("bundle-evaluated");
void SplashScreen.preventAutoHideAsync().catch((error) => log("warn", "preventAutoHideAsync failed", error));

function NotificationBridge() {
  const handle = useNotificationObserver();
  React.useEffect(() => handle(), [handle]);
  return null;
}

/** Rendered instead of the app when the bundle has no usable Supabase config. */
function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <View style={styles.configScreen}>
      <Logo size={80} />
      <Text style={styles.configTitle}>CONFIGURATION ERROR</Text>
      <Text style={styles.configText}>
        This build of RJNX GAMING ESPORTS was compiled without a valid Supabase configuration, so it cannot
        reach the arena backend.
      </Text>
      <Text style={styles.configDetail} selectable>
        {message}
      </Text>
      <Text style={styles.configHint}>
        Rebuild with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY set (see docs/setup.md).
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const [minimumElapsed, setMinimumElapsed] = React.useState(false);
  const [fontReady, setFontReady] = React.useState(false);
  const [fatal, setFatal] = React.useState<string | null>(null);
  const { loaded: fontsLoaded, error: fontError } = useBrandFonts();

  React.useEffect(() => {
    installGlobalErrorHandlers((message) => setFatal(message));
    // Restore the persisted session early so the first screen is not blank.
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) log("warn", "getSession error", error);
        log("info", `session restore: ${data.session ? "authenticated" : "anonymous"}`);
      })
      .catch((error) => log("warn", "getSession threw", error));
  }, []);

  React.useEffect(() => {
    // Keep the branded splash visible briefly so the arena intro reads clearly.
    const timer = setTimeout(() => setMinimumElapsed(true), 700);
    // Fonts must never block startup: fall back to system fonts on timeout.
    const fontTimer = setTimeout(() => {
      if (!fontReady) log("warn", "font load timed out — using system fonts");
      setFontReady(true);
    }, FONT_TIMEOUT_MS);
    const splashTimer = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => undefined);
    }, SPLASH_HARD_TIMEOUT_MS);
    return () => {
      clearTimeout(timer);
      clearTimeout(fontTimer);
      clearTimeout(splashTimer);
    };
  }, [fontReady]);

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      if (fontError) log("warn", "font load failed", fontError);
      setFontReady(true);
    }
  }, [fontsLoaded, fontError]);

  const ready = minimumElapsed && fontReady;

  React.useEffect(() => {
    if (!ready) return;
    markBoot("ui-ready");
    void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (fatal) {
    return (
      <View style={styles.configScreen}>
        <Logo size={72} />
        <Text style={styles.configTitle}>STARTUP FAILED</Text>
        <Text style={styles.configDetail} selectable>
          {fatal}
        </Text>
      </View>
    );
  }

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.bg }} />;
  }

  if (!hasSupabaseConfig) {
    return <ConfigErrorScreen message="EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are missing or invalid." />;
  }

  return (
    <ErrorBoundary scope="root">
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
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  configScreen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 26,
    gap: 14,
  },
  configTitle: { color: theme.colors.red, fontSize: 14, fontWeight: "900", letterSpacing: 2 },
  configText: { color: "#fff", fontSize: 13, textAlign: "center", lineHeight: 19 },
  configDetail: { color: theme.colors.amber, fontSize: 11, textAlign: "center", fontFamily: "monospace" },
  configHint: { color: theme.colors.muted, fontSize: 11, textAlign: "center", lineHeight: 17 },
});
