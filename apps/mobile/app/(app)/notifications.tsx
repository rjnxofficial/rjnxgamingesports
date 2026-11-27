import * as React from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { fetchNotifications, markNotificationsRead } from "@/lib/api";
import { Badge, Button, Card, Empty, ErrorNotice, Loader } from "@/components/ui";
import { theme } from "@/lib/theme";
import { relativeTime, type Notification } from "@rjnx/shared";

export default function NotificationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      setRows(await fetchNotifications(user.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const markAll = async () => {
    if (!user) return;
    try {
      await markNotificationsRead(user.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update notifications");
    }
  };

  const openLink = async (link: string | null) => {
    if (!link) return;
    const path = link
      .replace("/dashboard/matches", "/matches")
      .replace("/dashboard/notifications", "/notifications")
      .replace("/dashboard/teams", "/teams")
      .replace("/dashboard/profile", "/profile")
      .replace("/dashboard", "/");
    try {
      router.push(path as never);
    } catch {
      await markAll();
    }
  };

  if (loading) return <Loader label="Loading inbox…" />;

  const unread = rows.filter((row) => !row.is_read).length;

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

      <View style={styles.headerRow}>
        <Badge label={unread ? `${unread} unread` : "all caught up"} tone={unread ? "amber" : "green"} />
        {unread ? <Button label="Mark all read" variant="ghost" onPress={() => void markAll()} /> : null}
      </View>

      {rows.length ? (
        rows.map((row) => (
          <Pressable key={row.id} onPress={() => void openLink(row.link)}>
            <Card style={[styles.card, !row.is_read && styles.unreadCard]}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>{row.title}</Text>
                {!row.is_read ? <View style={styles.dot} /> : null}
              </View>
              <Text style={styles.body}>{row.body}</Text>
              <Text style={styles.time}>
                {row.type.replace(/_/g, " ")} · {relativeTime(row.created_at)}
              </Text>
            </Card>
          </Pressable>
        ))
      ) : (
        <Empty title="Inbox empty" description="Match alerts, registration updates and announcements land here." />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 14, paddingBottom: 40, gap: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  card: { gap: 4 },
  unreadCard: { borderColor: "rgba(0,207,255,0.35)", backgroundColor: "rgba(0,207,255,0.05)" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { color: "#fff", fontSize: 12, fontWeight: "700", flex: 1 },
  body: { color: "rgba(255,255,255,0.65)", fontSize: 11, lineHeight: 16 },
  time: { color: "rgba(255,255,255,0.3)", fontSize: 9, letterSpacing: 0.8, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.blue },
});
