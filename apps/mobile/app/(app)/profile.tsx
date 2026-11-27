import * as React from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { fetchMyPoints, fetchMyRegistrations, fetchMyTeams, fetchPlayerStats } from "@/lib/api";
import { Badge, Button, Card, Divider, Empty, ErrorNotice, Loader, SectionTitle, Stat, StatusPill } from "@/components/ui";
import { theme } from "@/lib/theme";
import { formatCurrency, formatDate } from "@rjnx/shared";

export default function ProfileScreen() {
  const { user, profile, roles, isStaff, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = React.useState<Awaited<ReturnType<typeof fetchPlayerStats>>>(null);
  const [registrations, setRegistrations] = React.useState<Awaited<ReturnType<typeof fetchMyRegistrations>>>([]);
  const [team, setTeam] = React.useState<Awaited<ReturnType<typeof fetchMyTeams>> | null>(null);
  const [points, setPoints] = React.useState<Awaited<ReturnType<typeof fetchMyPoints>>>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const [statsRow, regs, teamRow, pointsRow] = await Promise.all([
        fetchPlayerStats(user.id),
        fetchMyRegistrations(user.id),
        fetchMyTeams(user.id),
        fetchMyPoints(user.id),
      ]);
      setStats(statsRow);
      setPoints(pointsRow);
      setRegistrations(regs);
      setTeam(teamRow);
      await refreshProfile();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, refreshProfile]);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loader label="Loading your dossier…" />;

  const initials = (profile?.username ?? user?.email ?? "RJ").slice(0, 2).toUpperCase();
  const active = registrations.filter((row) => row.status !== "cancelled");

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

      <Card style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.username}>{profile?.username ?? "Player"}</Text>
          <Text style={styles.meta}>{profile?.in_game_name ?? "IGN not set"}</Text>
          <View style={styles.badgeRow}>
            {roles.map((role) => (
              <Badge key={role} label={role.replace(/_/g, " ")} tone={role === "super_admin" ? "pink" : role === "player" ? "neutral" : "purple"} />
            ))}
          </View>
        </View>
      </Card>

      {profile?.is_suspended ? (
        <Card style={styles.suspended}>
          <Text style={styles.suspendedTitle}>ACCOUNT SUSPENDED</Text>
          <Text style={styles.suspendedText}>{profile.suspended_reason ?? "Contact support for details."}</Text>
        </Card>
      ) : null}

      <View style={styles.statRow}>
        <Stat label="Points" value={String(points?.total_points ?? 0)} accent />
        <Stat label="Wins" value={String(stats?.wins ?? 0)} />
        <Stat label="Kills" value={String(stats?.total_kills ?? 0)} />
      </View>

      <View style={styles.statRow}>
        <Stat label="Rank" value={stats?.global_rank ? `#${stats.global_rank}` : "—"} />
        <Stat label="Played" value={String(stats?.completed_matches ?? 0)} />
        <Stat label="Earnings" value={formatCurrency(stats?.total_earnings ?? 0)} />
      </View>

      <SectionTitle title="My tournaments" action={<Text style={styles.count}>{active.length}</Text>} />
      {active.length ? (
        active.slice(0, 5).map((row) => {
          const tournament = row.tournament as unknown as { slug: string; name: string; starts_at: string; status: string } | null;
          return (
            <Pressable key={row.id} onPress={() => tournament && router.push(`/tournament/${tournament.slug}`)}>
              <Card style={styles.regRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.regName} numberOfLines={1}>
                    {tournament?.name ?? "Tournament"}
                  </Text>
                  <Text style={styles.meta}>
                    {tournament?.starts_at ? formatDate(tournament.starts_at) : "TBA"} · slot #{row.slot_number ?? "—"}
                  </Text>
                </View>
                <StatusPill status={row.status} />
              </Card>
            </Pressable>
          );
        })
      ) : (
        <Empty title="No registrations yet" description="Your tournament history appears here." />
      )}

      <SectionTitle title="My team" action={<Link href="/(app)/teams"><Text style={styles.link}>Manage →</Text></Link>} />
      {team?.membership ? (
        <Card style={{ gap: 6 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.regName}>
              {team.membership.team.name} {team.membership.team.tag ? `[${team.membership.team.tag}]` : ""}
            </Text>
            <Badge label={team.membership.role} tone="blue" />
          </View>
          <Text style={styles.meta}>{team.members.length} members</Text>
          <Divider />
          {team.members.map((member) => (
            <View key={member.user_id} style={styles.rowBetween}>
              <Text style={styles.memberName}>{member.profile?.username ?? "player"}</Text>
              <Text style={styles.meta}>{member.role}</Text>
            </View>
          ))}
        </Card>
      ) : (
        <Card style={{ gap: 8 }}>
          <Text style={styles.meta}>You are not on a team yet. Create one for squad events or accept an invite.</Text>
          <Button label="Create a team" variant="secondary" onPress={() => router.push("/(app)/teams")} />
        </Card>
      )}

      <View style={styles.actions}>
        <Button label="Edit profile" variant="secondary" onPress={() => router.push("/(app)/settings")} style={{ flex: 1 }} />
        <Button label="Notifications" variant="secondary" onPress={() => router.push("/(app)/notifications")} style={{ flex: 1 }} />
      </View>
      <Button label="Support" variant="secondary" onPress={() => router.push("/(app)/support")} />
      {isStaff ? <Button label="Open admin website" variant="secondary" onPress={() => router.push("/(app)/settings")} /> : null}
      <Button label="Sign out" variant="danger" onPress={() => void signOut()} />
      <Text style={styles.version}>RJNX GAMING ESPORTS · v1.0.0 · DEVKAZZU</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 14, paddingBottom: 48, gap: 10 },
  identity: { flexDirection: "row", gap: 12, alignItems: "center" },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(0,207,255,0.12)", borderWidth: 1, borderColor: "rgba(0,207,255,0.4)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: theme.colors.blue, fontSize: 18, fontWeight: "900" },
  username: { color: "#fff", fontSize: 16, fontWeight: "900" },
  meta: { color: theme.colors.muted, fontSize: 10 },
  badgeRow: { flexDirection: "row", gap: 4, flexWrap: "wrap", marginTop: 2 },
  suspended: { borderColor: "rgba(255,59,59,0.4)", backgroundColor: "rgba(255,59,59,0.08)", gap: 4 },
  suspendedTitle: { color: theme.colors.red, fontSize: 10, fontWeight: "800", letterSpacing: 1.6 },
  suspendedText: { color: "rgba(255,255,255,0.7)", fontSize: 11 },
  statRow: { flexDirection: "row", gap: 8 },
  count: { color: theme.colors.muted, fontSize: 10 },
  regRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  regName: { color: "#fff", fontSize: 12, fontWeight: "700" },
  link: { color: theme.colors.blue, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  memberName: { color: "rgba(255,255,255,0.8)", fontSize: 11 },
  actions: { flexDirection: "row", gap: 8 },
  version: { color: "rgba(255,255,255,0.2)", fontSize: 9, textAlign: "center", letterSpacing: 1.4, marginTop: 8 },
});
