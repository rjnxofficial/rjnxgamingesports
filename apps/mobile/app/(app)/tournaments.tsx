import * as React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { fetchGames, fetchTournaments, type TournamentListItem } from "@/lib/api";
import { Badge, Card, Empty, ErrorNotice, Loader, StatusPill } from "@/components/ui";
import { theme } from "@/lib/theme";
import { formatCurrency, relativeTime, type Game, type GameMode } from "@rjnx/shared";

const STATUSES = [
  { label: "All", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Live", value: "live" },
  { label: "Open", value: "registration_open" },
  { label: "Done", value: "completed" },
];

const MODES: { label: string; value: string }[] = [
  { label: "Any", value: "all" },
  { label: "Solo", value: "solo" },
  { label: "Duo", value: "duo" },
  { label: "Squad", value: "squad" },
];

export default function TournamentsScreen() {
  const router = useRouter();
  const [games, setGames] = React.useState<Game[]>([]);
  const [rows, setRows] = React.useState<TournamentListItem[]>([]);
  const [status, setStatus] = React.useState("all");
  const [gameId, setGameId] = React.useState<string | undefined>();
  const [mode, setMode] = React.useState<GameMode | "all">("all");
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const data = await fetchTournaments({ status, gameId, mode, limit: 60 });
      setRows(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load tournaments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, gameId, mode]);

  React.useEffect(() => {
    void fetchGames().then(setGames).catch(() => undefined);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = search.trim()
    ? rows.filter((row) => row.name.toLowerCase().includes(search.trim().toLowerCase()))
    : rows;

  if (loading) return <Loader label="Loading tournaments…" />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
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
      {error ? <ErrorNotice message={error} onRetry={() => void load()} /> : null}

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search tournaments…"
        placeholderTextColor="rgba(255,255,255,0.3)"
        style={styles.search}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {STATUSES.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => setStatus(item.value)}
            style={[styles.chip, status === item.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, status === item.value && styles.chipTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <Pressable onPress={() => setGameId(undefined)} style={[styles.chip, !gameId && styles.chipActive]}>
          <Text style={[styles.chipText, !gameId && styles.chipTextActive]}>All games</Text>
        </Pressable>
        {games.map((game) => (
          <Pressable
            key={game.id}
            onPress={() => setGameId(game.id === gameId ? undefined : game.id)}
            style={[styles.chip, gameId === game.id && styles.chipActive]}
          >
            <Text style={[styles.chipText, gameId === game.id && styles.chipTextActive]}>{game.short_name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.modeRow}>
        {MODES.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => setMode(item.value as GameMode | "all")}
            style={[styles.modeChip, mode === item.value && styles.modeChipActive]}
          >
            <Text style={[styles.modeText, mode === item.value && styles.modeTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.count}>{filtered.length} events</Text>

      {filtered.length ? (
        filtered.map((tournament) => (
          <Pressable key={tournament.id} onPress={() => router.push(`/tournament/${tournament.slug}`)}>
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.name}>{tournament.name}</Text>
                  <Text style={styles.meta}>
                    {tournament.game?.name ?? "RJNX"} · {tournament.mode} · {tournament.format.replace(/_/g, " ")}
                  </Text>
                </View>
                <StatusPill status={tournament.status} />
              </View>

              <View style={styles.statGrid}>
                <View style={styles.statCell}>
                  <Text style={styles.statLabel}>PRIZE</Text>
                  <Text style={styles.statValue}>{formatCurrency(tournament.prize_pool)}</Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statLabel}>ENTRY</Text>
                  <Text style={styles.statValue}>{tournament.entry_fee > 0 ? formatCurrency(tournament.entry_fee) : "FREE"}</Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statLabel}>SLOTS</Text>
                  <Text style={styles.statValue}>
                    {tournament.slots?.taken ?? 0}/{tournament.max_slots}
                  </Text>
                </View>
              </View>

              <View style={styles.footerRow}>
                <Text style={styles.footer}>Starts {relativeTime(tournament.starts_at)}</Text>
                <Badge label={tournament.requires_approval ? "approval" : "instant"} tone={tournament.requires_approval ? "amber" : "green"} />
              </View>
            </Card>
          </Pressable>
        ))
      ) : (
        <Empty title="No tournaments match" description="Change the filters or check back after the next drop." />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 14, paddingBottom: 40, gap: 10 },
  search: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.line,
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  chipRow: { gap: 6, paddingVertical: 2 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: theme.radius.pill, borderWidth: 1, borderColor: theme.colors.line },
  chipActive: { backgroundColor: "rgba(0,207,255,0.14)", borderColor: "rgba(0,207,255,0.45)" },
  chipText: { color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  chipTextActive: { color: "#fff" },
  modeRow: { flexDirection: "row", gap: 6 },
  modeChip: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.line },
  modeChipActive: { backgroundColor: "rgba(139,92,255,0.16)", borderColor: "rgba(139,92,255,0.5)" },
  modeText: { color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  modeTextActive: { color: "#fff" },
  count: { color: theme.colors.muted, fontSize: 10, letterSpacing: 1.4 },
  card: { gap: 10 },
  cardHeader: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  name: { color: "#fff", fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },
  meta: { color: theme.colors.muted, fontSize: 10 },
  statGrid: { flexDirection: "row", gap: 6 },
  statCell: { flex: 1, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: theme.radius.sm, padding: 8 },
  statLabel: { color: "rgba(255,255,255,0.35)", fontSize: 7, letterSpacing: 1.2 },
  statValue: { color: "#fff", fontSize: 12, fontWeight: "800", marginTop: 2 },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footer: { color: "rgba(255,255,255,0.4)", fontSize: 10 },
});
