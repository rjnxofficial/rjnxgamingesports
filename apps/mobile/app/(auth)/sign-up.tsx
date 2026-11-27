import * as React from "react";
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Button, Field } from "@/components/ui";
import { Logo } from "@/components/logo";
import { theme } from "@/lib/theme";

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function submit() {
    if (!/^[A-Za-z0-9_.]{3,24}$/.test(username)) {
      setError("Username: 3–24 characters, letters, numbers, _ or .");
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*[0-9]).{8,}$/.test(password)) {
      setError("Password needs 8+ characters with a letter and a number.");
      return;
    }
    if (!email.includes("@") || fullName.trim().length < 2) {
      setError("Enter your full name and a valid email.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await signUp({ email: email.trim().toLowerCase(), password, username, fullName: fullName.trim() });
      if (result.needsConfirmation) {
        setInfo("Account created. Check your email to verify, then sign in.");
      } else {
        router.replace("/(app)");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Logo size={54} />
          <Text style={styles.title}>Join RJNX</Text>
          <Text style={styles.subtitle}>One account for every tournament on web and Android.</Text>
        </View>

        {info ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{info}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Savage One" />
          <Field
            label="Username"
            value={username}
            onChangeText={(value) => setUsername(value.replace(/[^a-zA-Z0-9_.]/g, ""))}
            autoCapitalize="none"
            placeholder="savage_one"
          />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="8+ chars, 1 letter, 1 number" error={error} />
          <Button label="Create account" onPress={submit} loading={loading} />
        </View>

        <Link href="/(auth)/sign-in" asChild>
          <Text style={styles.link}>Already registered? Sign in →</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.bg },
  container: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 22 },
  header: { alignItems: "center", gap: 10 },
  title: { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: 1 },
  subtitle: { color: theme.colors.muted, fontSize: 12, textAlign: "center" },
  form: { gap: 12 },
  infoBox: { borderWidth: 1, borderColor: "rgba(0,207,255,0.35)", backgroundColor: "rgba(0,207,255,0.08)", borderRadius: 10, padding: 12 },
  infoText: { color: theme.colors.blue, fontSize: 12, textAlign: "center" },
  link: { color: theme.colors.blue, fontSize: 12, textAlign: "center", paddingVertical: 8 },
});
