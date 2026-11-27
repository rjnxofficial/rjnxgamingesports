import * as React from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from "react-native";
import { useAuth } from "@/lib/auth";
import {
  createTeam,
  disbandTeam,
  fetchGames,
  fetchMyInvitations,
  fetchMyTeams,
  invitePlayerByUsername,
  leaveTeam,
  respondToInvitation,
} from "@/lib/api";
import { Badge, Button, Card, Divider, Empty, ErrorNotice, Field, Loader, SectionTitle } from "@/components/ui";
import { theme } from "@/lib/theme";
import type { Game } from "@rjnx/shared";

type TeamState = Awaited<ReturnType<typeof fetchMyTeams>>;

export default function TeamsScreen() {
  const { user } = useAuth();
  const [state, setState] = React.useState<TeamState | null>(null);
  const [invitations, setInvitations] = React.useState<Awaited<ReturnType<typeof fetchMyInvitations>>>([]);
  const [games, setGames] = React.useState<Game[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [teamName, setTeamName] = React.useState("");
  const [teamTag, setTeamTag] = React.useState("");
  const [gameId, setGameId] = React.useState<string | undefined>();
  const [inviteName, setInviteName] = React.useState("");
  const [inviteNote, setInviteNote] = React.useState("");

  const load = React.useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const [teamRow, invites] = await Promise.all([fetchMyTeams(user.id), fetchMyInvitations(user.id)]);
      setState(teamRow);
      setInvitations(invites);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your team");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    void fetchGames().then(setGames).catch(() => undefined);
  }, []);

  const run = async (action: () => Promise<void>, success?: string) => {
    setBusy(true);
    try {
      await action();
      await load();
      if (success) Alert.alert("Done", success);
    } catch (caught) {
      Alert.alert("Action failed", caught instanceof Error ? caught.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) return <Loader label="Loading roster…" />;

  const membership = state?.membership ?? null;
  const team = membership?.team ?? null;
  const isCaptain = Boolean(team && (membership?.role === "captain" || team.captain_id === user.id));

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

      {invitations.length ? (
        <>
          <SectionTitle title="Invitations" action={<Badge label={`${invitations.length} pending`} tone="amber" />} />
          {invitations.map((invite) => (
            <Card key={invite.id} style={{ gap: 8 }}>
              <Text style={styles.teamName}>{invite.team?.name ?? "Team"}</Text>
              <Text style={styles.meta}>
                Invited by {invite.inviter?.username ?? "a captain"}
                {invite.message ? ` · "${invite.message}"` : ""}
              </Text>
              <View style={styles.row}>
                <Button
                  label="Accept"
                  onPress={() => void run(() => respondToInvitation(invite.id, true), "Welcome to the squad.")}
                  loading={busy}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Decline"
                  variant="secondary"
                  onPress={() => void run(() => respondToInvitation(invite.id, false))}
                  style={{ flex: 1 }}
                />
              </View>
            </Card>
          ))}
        </>
      ) : null}

      {team ? (
        <>
          <Card style={{ gap: 8 }}>
            <View style={styles.rowBetween}>
              <Text style={styles.teamName}>
                {team.name} {team.tag ? <Text style={styles.tag}>[{team.tag}]</Text> : null}
              </Text>
              <Badge label={membership?.role ?? "member"} tone="blue" />
            </View>
            <Text style={styles.meta}>
              {games.find((game) => game.id === team.game_id)?.name ?? "Any game"} · {state?.members.length ?? 0} members
            </Text>
            <Divider />
            {state?.members.map((member) => (
              <View key={member.user_id} style={styles.rowBetween}>
                <Text style={styles.memberName}>{member.profile?.username ?? "player"}</Text>
                <Text style={styles.meta}>{member.role.toUpperCase()}</Text>
              </View>
            ))}
          </Card>

          {isCaptain ? (
            <>
              <SectionTitle title="Invite a player" />
              <Card style={{ gap: 10 }}>
                <Field label="Username" value={inviteName} onChangeText={setInviteName} autoCapitalize="none" placeholder="exact username" />
                <Field label="Message (optional)" value={inviteNote} onChangeText={setInviteNote} placeholder="Tryouts this Friday" />
                <Button
                  label="Send invite"
                  loading={busy}
                  onPress={() =>
                    void run(async () => {
                      await invitePlayerByUsername(team.id, user.id, inviteName, inviteNote.trim() || undefined);
                      setInviteName("");
                      setInviteNote("");
                    }, "Invitation sent.")
                  }
                />
              </Card>
              <Button
                label="Disband team"
                variant="danger"
                loading={busy}
                onPress={() =>
                  Alert.alert("Disband team?", "This removes the roster permanently.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Disband", style: "destructive", onPress: () => void run(() => disbandTeam(team.id)) },
                  ])
                }
              />
            </>
          ) : (
            <Button
              label="Leave team"
              variant="danger"
              loading={busy}
              onPress={() =>
                Alert.alert("Leave team?", "You can rejoin only with a new invite.", [
                  { text: "Stay", style: "cancel" },
                  { text: "Leave", style: "destructive", onPress: () => void run(() => leaveTeam(team.id, user.id)) },
                ])
              }
            />
          )}
        </>
      ) : (
        <>
          <Empty title="No team yet" description="Create a squad for duo and squad tournaments, then invite your roster." />
          <Card style={{ gap: 10 }}>
            <Text style={styles.cardTitle}>CREATE TEAM</Text>
            <Field label="Team name" value={teamName} onChangeText={setTeamName} placeholder="3–40 characters" />
            <Field label="Tag (max 6)" value={teamTag} onChangeText={setTeamTag} autoCapitalize="characters" placeholder="RJNX" />
            <Text style={styles.fieldLabel}>GAME</Text>
            <View style={styles.chipRow}>
              <Button label="Any game" variant={gameId ? "secondary" : "primary"} onPress={() => setGameId(undefined)} style={{ flex: 1 }} />
              {games.slice(0, 3).map((game) => (
                <Button
                  key={game.id}
                  label={game.short_name}
                  variant={gameId === game.id ? "primary" : "secondary"}
                  onPress={() => setGameId(game.id)}
                  style={{ flex: 1 }}
                />
              ))}
            </View>
            <Button
              label="Create team"
              loading={busy}
              onPress={() =>
                void run(async () => {
                  if (teamName.trim().length < 3) throw new Error("Team name must be at least 3 characters");
                  await createTeam({
                    name: teamName.trim(),
                    tag: teamTag.trim() || null,
                    gameId: gameId ?? null,
                    userId: user.id,
                  });
                  setTeamName("");
                  setTeamTag("");
                }, "Team created.")
              }
            />
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 14, paddingBottom: 48, gap: 10 },
  row: { flexDirection: "row", gap: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  teamName: { color: "#fff", fontSize: 14, fontWeight: "900" },
  tag: { color: theme.colors.blue },
  meta: { color: theme.colors.muted, fontSize: 10 },
  memberName: { color: "rgba(255,255,255,0.82)", fontSize: 12 },
  cardTitle: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: "800", letterSpacing: 2 },
  fieldLabel: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: "700", letterSpacing: 1.6 },
  chipRow: { flexDirection: "row", gap: 6 },
});
