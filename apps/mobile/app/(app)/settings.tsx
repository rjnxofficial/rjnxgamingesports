import * as React from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Linking } from "react-native";
import { useAuth } from "@/lib/auth";
import { fetchGames, updateProfile } from "@/lib/api";
import { Badge, Button, Card, Field, Loader, SectionTitle } from "@/components/ui";
import { theme } from "@/lib/theme";
import type { Game, Profile } from "@rjnx/shared";

export default function SettingsScreen() {
  const { user, profile, refreshProfile, resetPassword, signOut, isStaff } = useAuth();
  const [games, setGames] = React.useState<Game[]>([]);
  const [form, setForm] = React.useState<Partial<Profile>>({});
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void fetchGames()
      .then(setGames)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name,
        in_game_name: profile.in_game_name,
        game_uid: profile.game_uid,
        phone: profile.phone,
        country: profile.country ?? "India",
        state: profile.state,
        bio: profile.bio,
      });
    }
  }, [profile]);

  const set = (key: keyof Profile) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await updateProfile(user.id, form);
      await refreshProfile();
      Alert.alert("Saved", "Your player profile is up to date.");
    } catch (caught) {
      Alert.alert("Could not save", caught instanceof Error ? caught.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader label="Loading settings…" />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SectionTitle title="Player profile" action={<Badge label={profile?.username ?? "player"} tone="blue" />} />
      <Card style={{ gap: 10 }}>
        <Field label="Full name" value={form.full_name ?? ""} onChangeText={set("full_name")} placeholder="Your real name" />
        <Field label="In-game name" value={form.in_game_name ?? ""} onChangeText={set("in_game_name")} placeholder="IGN on tournaments" />
        <Field label="Game UID" value={form.game_uid ?? ""} onChangeText={set("game_uid")} keyboardType="number-pad" placeholder="Numeric UID" />
        <Field label="Phone" value={form.phone ?? ""} onChangeText={set("phone")} keyboardType="phone-pad" placeholder="+91…" />
        <Field label="State" value={form.state ?? ""} onChangeText={set("state")} placeholder="Assam" />
        <Field label="Country" value={form.country ?? ""} onChangeText={set("country")} placeholder="India" />
        <Field label="Bio" value={form.bio ?? ""} onChangeText={set("bio")} placeholder="Tell the arena who you are" multiline numberOfLines={3} />
        <Button label="Save profile" loading={busy} onPress={() => void save()} />
      </Card>

      <SectionTitle title="Account" />
      <Card style={{ gap: 8 }}>
        <Text style={styles.meta}>Signed in as {user?.email ?? "unknown"}</Text>
        <Button
          label="Send password reset email"
          variant="secondary"
          onPress={() => {
            if (!user?.email) return;
            Alert.alert("Reset password", `Send a reset link to ${user.email}?`, [
              { text: "Cancel", style: "cancel" },
              {
                text: "Send",
                onPress: async () => {
                  try {
                    await resetPassword(user.email!);
                    Alert.alert("Sent", "Check your inbox for the reset link.");
                  } catch (caught) {
                    Alert.alert("Failed", caught instanceof Error ? caught.message : "Try again.");
                  }
                },
              },
            ]);
          }}
        />
        {isStaff ? (
          <Button
            label="Open admin command center (web)"
            variant="secondary"
            onPress={() => void Linking.openURL(`${process.env.EXPO_PUBLIC_SITE_URL ?? ""}/admin`)}
          />
        ) : null}
        <Button label="Sign out" variant="danger" onPress={() => void signOut()} />
      </Card>

      <SectionTitle title="Supported games" />
      <Card style={{ gap: 6 }}>
        {games.length ? (
          games.map((game) => (
            <View key={game.id} style={styles.gameRow}>
              <Text style={styles.gameName}>{game.name}</Text>
              <Text style={styles.meta}>{game.short_name}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.meta}>No games published yet.</Text>
        )}
      </Card>

      <Text style={styles.version}>RJNX GAMING ESPORTS · v1.0.0 · built by DEVKAZZU</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 14, paddingBottom: 48, gap: 10 },
  meta: { color: theme.colors.muted, fontSize: 10 },
  gameRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  gameName: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },
  version: { color: "rgba(255,255,255,0.2)", fontSize: 9, textAlign: "center", letterSpacing: 1.2, marginTop: 8 },
});
