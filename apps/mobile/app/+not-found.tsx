import * as React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";
import { theme } from "@/lib/theme";

/** Shown for any route that does not exist (also deep links with bad paths). */
export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Logo size={72} />
      <Text style={styles.title}>LOST IN THE ARENA</Text>
      <Text style={styles.text}>That screen does not exist — it may have been moved or retired.</Text>
      <Button label="Back to home" onPress={() => router.replace("/(app)")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center", padding: 28, gap: 14 },
  title: { color: "#fff", fontSize: 16, fontWeight: "900", letterSpacing: 2 },
  text: { color: theme.colors.muted, fontSize: 12, textAlign: "center", lineHeight: 18, marginBottom: 6 },
});
