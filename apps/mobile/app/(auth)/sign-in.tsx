import * as React from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Button, Field } from "@/components/ui";
import { Logo } from "@/components/logo";
import { theme } from "@/lib/theme";

export default function SignInScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function submit() {
    if (!email.includes("@") || password.length < 1) {
      setError("Enter a valid email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace("/(app)");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Logo size={64} />
          <Text style={styles.title}>Enter the arena</Text>
          <Text style={styles.subtitle}>Sign in to register for tournaments and see your room details.</Text>
        </View>

        <View style={styles.form}>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            error={error}
          />
          <Button label="Sign in" onPress={submit} loading={loading} />
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable>
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to RJNX?</Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text style={[styles.link, { fontSize: 13 }]}>Create your player account →</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.bg },
  container: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 28 },
  header: { alignItems: "center", gap: 12 },
  title: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 1 },
  subtitle: { color: theme.colors.muted, fontSize: 13, textAlign: "center", lineHeight: 19, maxWidth: 320 },
  form: { gap: 14 },
  link: { color: theme.colors.blue, fontSize: 12, textAlign: "center", paddingVertical: 6 },
  footer: { alignItems: "center", gap: 2, borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.line, paddingTop: 16 },
  footerText: { color: theme.colors.muted, fontSize: 12 },
});
