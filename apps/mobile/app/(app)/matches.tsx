import * as React from "react";
import { View, Text, StyleSheet, RefreshControl, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { fetchMyMatches } from "@/lib/api";
import { Card, Empty, ErrorNotice, Loader, StatusPill } from "@/components/ui";
import { theme } from "@/lib/theme";
import { formatDate, relativeTime } from "@rjnx/shared";

export default function MatchesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = React.useState<Awaited<ReturnType<typeof fetchMyMatches>>>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      setRows(await fetchMyMatches(user.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load matches");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loader label="Loading match center…" />;

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

      {rows.length ? (
        rows.map((match) => (
          <Card key={match.id} style={styles.card}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.title}>{match.tournament?.name ?? "Match"}</Text>
                <Text style={styles.meta}>
                  Round {match.round} · Match #{match.match_number} · {match.map_name ?? "Map TBD"}
                </Text>
              </View>
              <StatusPill status={match.status} />
            </View>

            <Text style={styles.schedule}>
              {match.scheduled_at ? `${formatDate(match.scheduled_at)} (${relativeTime(match.scheduled_at)})` : "Schedule TBA"}
            </Text>

            {match.room ? (
              <View style={styles.room}>
                <Text style={styles.roomLabel}>ROOM CREDENTIALS</Text>
                <View style={styles.roomRow}>
                  <View style={styles.roomCell}>
                    <Text style={styles.roomKey}>ROOM ID</Text>
                    <Text style={styles.roomValue}>{match.room.room_id}</Text>
                  </View>
                  <View style={styles.roomCell}>
                    <Text style={styles.roomKey}>PASSWORD</Text>
                    <Text style={styles.roomValue}>{match.room.room_password || "—"}</Text>
                  </View>
                </View>
              </View>
            ) : match.room_published_at ? (
              <Text style={styles.locked}>Room published — visible to approved participants only.</Text>
            ) : (
              <Text style={styles.pending}>Room details drop 15 minutes before start.</Text>
            )}

            {match.tournament?.slug ? (
              <Pressable onPress={() => router.push(`/tournament/${match.tournament?.slug}`)}>
                <Text style={styles.link}>Open tournament →</Text>
              </Pressable>
            ) : null}
          </Card>
        ))
      ) : (
        <Empty
          title="No matches scheduled"
          description="Register for a tournament and your schedule plus room credentials appear here."
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 14, paddingBottom: 40, gap: 10 },
  card: { gap: 9 },
  headerRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  title: { color: "#fff", fontSize: 13, fontWeight: "800" },
  meta: { color: theme.colors.muted, fontSize: 10 },
  schedule: { color: "rgba(255,255,255,0.55)", fontSize: 11 },
  room: { backgroundColor: "rgba(0,207,255,0.08)", borderWidth: 1, borderColor: "rgba(0,207,255,0.3)", borderRadius: theme.radius.sm, padding: 10, gap: 6 },
  roomLabel: { color: theme.colors.blue, fontSize: 8, fontWeight: "800", letterSpacing: 2 },
  roomRow: { flexDirection: "row", gap: 8 },
  roomCell: { flex: 1 },
  roomKey: { color: "rgba(255,255,255,0.4)", fontSize: 8, letterSpacing: 1.4 },
  roomValue: { color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: 1 },
  locked: { color: theme.colors.amber, fontSize: 10 },
  pending: { color: "rgba(255,255,255,0.4)", fontSize: 10 },
  link: { color: theme.colors.blue, fontSize: 11, fontWeight: "700" },
});
