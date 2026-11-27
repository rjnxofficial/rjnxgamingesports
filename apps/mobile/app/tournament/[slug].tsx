import * as React from "react";
import { View, Text, StyleSheet, Image, Alert, ScrollView, RefreshControl, Linking } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import {
  cancelRegistration,
  fetchMyRegistrations,
  fetchTournament,
  registerForTournament,
} from "@/lib/api";
import { Badge, Button, Card, Divider, ErrorNotice, Loader, Stat, StatusPill } from "@/components/ui";
import { theme } from "@/lib/theme";
import { formatCurrency, formatDate, relativeTime } from "@rjnx/shared";

type Detail = Awaited<ReturnType<typeof fetchTournament>>;

export default function TournamentDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = React.useState<Detail>(null);
  const [registration, setRegistration] = React.useState<{ id: string; status: string; slot_number: number | null } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!slug) return;
    setError(null);
    try {
      const detail = await fetchTournament(slug);
      setData(detail);
      if (detail && user) {
        const mine = (await fetchMyRegistrations(user.id)) as unknown as {
          id: string;
          status: string;
          slot_number: number | null;
          tournament: { id: string } | null;
        }[];
        const row = mine.find((item) => item.tournament?.id === detail.tournament.id) ?? null;
        setRegistration(row ? { id: row.id, status: row.status, slot_number: row.slot_number } : null);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load tournament");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug, user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleRegister = async () => {
    if (!data) return;
    setBusy(true);
    try {
      await registerForTournament(data.tournament.id);
      await load();
      Alert.alert("Registered", "Your slot is confirmed. Room credentials appear in My Matches.");
    } catch (caught) {
      Alert.alert("Registration failed", caught instanceof Error ? caught.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    if (!registration) return;
    Alert.alert("Cancel registration?", "Your slot will be released to other players.", [
      { text: "Keep slot", style: "cancel" },
      {
        text: "Cancel",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await cancelRegistration(registration.id);
            await load();
          } catch (caught) {
            Alert.alert("Could not cancel", caught instanceof Error ? caught.message : "Try again.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  if (loading) return <Loader label="Loading tournament…" />;

  if (!data) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ title: "Tournament" }} />
        <ErrorNotice message="This tournament is not available." onRetry={() => void load()} />
      </View>
    );
  }

  const { tournament, slots, matches } = data;
  const open = tournament.status === "registration_open" || tournament.status === "published";
  const full = slots.taken >= tournament.max_slots;
  const remaining = Math.max(0, tournament.max_slots - slots.taken);
  const banner = tournament.banner_url?.startsWith("http")
    ? tournament.banner_url
    : tournament.banner_url
      ? `${process.env.EXPO_PUBLIC_SITE_URL ?? ""}${tournament.banner_url}`
      : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={theme.colors.blue}
        />
      }
    >
      <Stack.Screen options={{ title: tournament.game?.short_name ?? "Tournament" }} />
      {error ? <ErrorNotice message={error} onRetry={() => void load()} /> : null}

      {banner ? <Image source={{ uri: banner }} style={styles.banner} resizeMode="cover" /> : null}

      <View style={styles.headerBlock}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{tournament.name}</Text>
          <StatusPill status={tournament.status} />
        </View>
        <Text style={styles.subtitle}>
          {tournament.game?.name ?? "RJNX"} · {tournament.mode.toUpperCase()} · {tournament.format.replace(/_/g, " ")}
        </Text>
      </View>

      <View style={styles.statRow}>
        <Stat label="Prize" value={formatCurrency(tournament.prize_pool)} accent />
        <Stat label="Entry" value={tournament.entry_fee > 0 ? formatCurrency(tournament.entry_fee) : "FREE"} />
        <Stat label="Slots" value={`${slots.taken}/${tournament.max_slots}`} />
      </View>

      <Card style={{ gap: 8 }}>
        <Row label="Starts" value={formatDate(tournament.starts_at)} />
        <Row label="Ends" value={formatDate(tournament.ends_at)} />
        <Row label="Registration closes" value={formatDate(tournament.registration_ends_at)} />
        <Row label="Team size" value={`${tournament.min_team_size}–${tournament.max_team_size} players`} />
        <Row label="Seats left" value={`${remaining} of ${tournament.max_slots}`} />
      </Card>

      {registration ? (
        <Card style={styles.registrationCard}>
          <Text style={styles.cardTitle}>YOUR REGISTRATION</Text>
          <View style={styles.headerRow}>
            <Text style={styles.registrationText}>
              Slot #{registration.slot_number ?? "—"} · {registration.status.replace(/_/g, " ")}
            </Text>
            <Badge label={registration.status} tone={registration.status === "approved" ? "green" : registration.status === "pending" ? "amber" : "blue"} />
          </View>
          <Button label="Cancel registration" variant="danger" onPress={handleCancel} loading={busy} />
        </Card>
      ) : open && !full ? (
        <Button
          label={tournament.entry_fee > 0 ? `Register · ${formatCurrency(tournament.entry_fee)}` : "Register free"}
          onPress={handleRegister}
          loading={busy}
        />
      ) : (
        <Button label={full ? "Tournament full" : "Registration closed"} onPress={() => undefined} disabled />
      )}

      {tournament.entry_fee > 0 ? (
        <Text style={styles.note}>
          Paid entries are verified server-side. Open the website to complete the Razorpay checkout for this tournament, then return
          here — your slot is confirmed automatically.
        </Text>
      ) : null}

      <Text style={styles.sectionLabel}>PRIZE DISTRIBUTION</Text>
      <Card>
        {tournament.prize_distribution && Object.keys(tournament.prize_distribution).length ? (
          Object.entries(tournament.prize_distribution).map(([place, amount]) => (
            <Row key={place} label={place.replace(/_/g, " ").toUpperCase()} value={formatCurrency(Number(amount))} />
          ))
        ) : (
          <Text style={styles.muted}>Prize split announced before the finals.</Text>
        )}
      </Card>

      <Text style={styles.sectionLabel}>SCHEDULE</Text>
      <Card style={{ gap: 10 }}>
        {matches.length ? (
          matches.map((match) => (
            <View key={match.id}>
              <Row
                label={`Round ${match.round} · Match ${match.match_number}`}
                value={match.scheduled_at ? relativeTime(match.scheduled_at) : "TBA"}
              />
              <Text style={styles.matchMeta}>
                {match.map_name ?? "Map TBD"} · {match.status.replace(/_/g, " ")}
              </Text>
              <Divider />
            </View>
          ))
        ) : (
          <Text style={styles.muted}>Bracket is generated once registration closes.</Text>
        )}
      </Card>

      {tournament.rules ? (
        <>
          <Text style={styles.sectionLabel}>RULES</Text>
          <Card>
            <Text style={styles.rules}>{tournament.rules}</Text>
          </Card>
        </>
      ) : null}

      {tournament.description ? (
        <>
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <Card>
            <Text style={styles.rules}>{tournament.description}</Text>
          </Card>
        </>
      ) : null}

      <View style={styles.linkRow}>
        <Button label="My matches" variant="secondary" onPress={() => router.push("/(app)/matches")} style={{ flex: 1 }} />
        <Button
          label="Open on web"
          variant="secondary"
          onPress={() => void Linking.openURL(`${process.env.EXPO_PUBLIC_SITE_URL ?? "https://rjnxgamingesports.com"}/tournaments/${tournament.slug}`)}
          style={{ flex: 1 }}
        />
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 14, paddingBottom: 48, gap: 12 },
  banner: { width: "100%", height: 150, borderRadius: theme.radius.md },
  headerBlock: { gap: 5 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { color: "#fff", fontSize: 18, fontWeight: "900", flex: 1 },
  subtitle: { color: theme.colors.muted, fontSize: 10, letterSpacing: 1 },
  statRow: { flexDirection: "row", gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 3 },
  rowLabel: { color: theme.colors.muted, fontSize: 10, letterSpacing: 0.8, flexShrink: 1 },
  rowValue: { color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: "700" },
  registrationCard: { gap: 10, borderColor: "rgba(53,230,163,0.35)", backgroundColor: "rgba(53,230,163,0.06)" },
  cardTitle: { color: theme.colors.green, fontSize: 9, fontWeight: "800", letterSpacing: 2 },
  registrationText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  note: { color: "rgba(255,255,255,0.4)", fontSize: 10, lineHeight: 15 },
  sectionLabel: { color: "rgba(255,255,255,0.55)", fontSize: 9, fontWeight: "800", letterSpacing: 2, marginTop: 4 },
  matchMeta: { color: "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 2 },
  rules: { color: "rgba(255,255,255,0.7)", fontSize: 12, lineHeight: 19 },
  muted: { color: theme.colors.muted, fontSize: 11 },
  linkRow: { flexDirection: "row", gap: 8, marginTop: 4 },
});
