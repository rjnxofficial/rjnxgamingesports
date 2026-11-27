import * as React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { Button, Field } from "@/components/ui";
import { Logo } from "@/components/logo";
import { theme } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function submit() {
    if (!email.includes("@")) {
      setError("Enter a valid email.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resetPassword(email.trim().toLowerCase());
      setMessage("Reset link sent. Check your inbox, then return here to sign in with the new password.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Logo size={54} />
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>We'll email you a secure link to set a new password.</Text>

      <View style={styles.form}>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" error={error} />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <Button label="Send reset link" onPress={submit} loading={loading} />
        <Button label="Back to sign in" variant="ghost" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, justifyContent: "center", padding: 24, gap: 14, alignItems: "stretch" },
  title: { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: 1, textAlign: "center" },
  subtitle: { color: theme.colors.muted, fontSize: 12, textAlign: "center" },
  form: { gap: 12, marginTop: 8 },
  success: { color: theme.colors.green, fontSize: 12, textAlign: "center" },
});
