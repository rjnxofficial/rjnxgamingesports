import * as React from "react";
import { Redirect } from "expo-router";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { theme } from "@/lib/theme";
import { log } from "@/lib/runtime";

export default function IndexScreen() {
  const { ready, session } = useAuth();
  const pulse = React.useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  React.useEffect(() => {
    if (ready) log("info", `router: session ${session ? "present" : "absent"} → ${session ? "/(app)" : "/(auth)/sign-in"}`);
  }, [ready, session]);

  if (ready) {
    return <Redirect href={session ? "/(app)" : "/(auth)/sign-in"} />;
  }

  return (
    <View style={styles.container}>
      <Logo size={92} />
      <Animated.Text style={[styles.tagline, { opacity: pulse }]}>BE SAVAGE. NOT AVERAGE.</Animated.Text>
      <Text style={styles.hint}>Initialising arena…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg, gap: 14 },
  tagline: { color: theme.colors.blue, fontSize: 11, fontWeight: "800", letterSpacing: 4 },
  hint: { color: theme.colors.muted, fontSize: 10, letterSpacing: 2 },
});
