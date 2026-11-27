import * as React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { theme } from "@/lib/theme";

/**
 * Deep link target for `rjnx://auth/callback` (email confirmation, password
 * recovery). Exchanges the returned tokens for a session.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const [message, setMessage] = React.useState("Verifying your link…");

  React.useEffect(() => {
    (async () => {
      const initial = await Linking.getInitialURL();
      if (initial) {
        const params = new URL(initial.replace("rjnx://", "https://rjnx.local/")).searchParams;
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) {
            setMessage(error.message);
            return;
          }
          router.replace("/(app)");
          return;
        }
      }
      setMessage("Open the app again from your email link, or sign in manually.");
    })();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={theme.colors.blue} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  text: { color: theme.colors.muted, fontSize: 12, textAlign: "center" },
});
