import * as React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl } from "react-native";
import { fetchLeaderboard } from "@/lib/api";
import { Card, Empty, ErrorNotice, Loader } from "@/components/ui";
import { theme } from "@/lib/theme";

export default function LeaderboardScreen() {
  const [scope, setScope] = React.useState<"players" | "teams">("players");
  const [rows, setRows] = React.useState<Awaited<ReturnType<typeof fetchLeaderboard>>>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      setRows(await fetchLeaderboard(scope, 50));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load leaderboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [scope]);

  React.useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  if (loading) return <Loader label="Ranking the arena…" />;

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
      {error ? <ErrorNotice message={error} onRetry={() => void load()} /> : null}

      <View style={styles.tabs}>
        {(["players", "teams"] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setScope(value)}
            style={[styles.tab, scope === value && styles.tabActive]}
          >
            <Text style={[styles.tabText, scope === value && styles.tabTextActive]}>{value.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      {rows.length ? (
        rows.map((row, index) => {
          const name = scope === "teams" ? row.team?.name : row.profile?.username;
          return (
            <Card key={`${row.owner_id}-${index}`} style={[styles.row, index < 3 && styles.podium]}>
              <View style={[styles.rank, index === 0 && styles.rankGold]}>
                <Text style={[styles.rankText, index === 0 && styles.rankTextGold]}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {name ?? "—"}
                </Text>
                <Text style={styles.meta}>
                  {row.total_kills} kills · {row.wins} wins · {row.tournaments} events
                </Text>
              </View>
              <Text style={styles.points}>{row.total_points}</Text>
            </Card>
          );
        })
      ) : (
        <Empty title="Leaderboard is empty" description="Verified match results populate this board automatically." />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 14, paddingBottom: 40, gap: 8 },
  tabs: { flexDirection: "row", gap: 6, marginBottom: 4 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.line },
  tabActive: { backgroundColor: "rgba(0,207,255,0.14)", borderColor: "rgba(0,207,255,0.45)" },
  tabText: { color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  tabTextActive: { color: "#fff" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  podium: { borderColor: "rgba(0,207,255,0.28)" },
  rank: { width: 26, height: 26, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  rankGold: { backgroundColor: "rgba(255,200,87,0.2)" },
  rankText: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "800" },
  rankTextGold: { color: theme.colors.amber },
  name: { color: "#fff", fontSize: 12, fontWeight: "700" },
  meta: { color: theme.colors.muted, fontSize: 9, letterSpacing: 0.8 },
  points: { color: theme.colors.blue, fontSize: 14, fontWeight: "900" },
});
