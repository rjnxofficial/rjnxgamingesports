import * as React from "react";
import { View, Text, StyleSheet, Pressable, Image, RefreshControl, ScrollView } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { fetchBanners, fetchNews, fetchPlatformStats, fetchTournaments, type TournamentListItem } from "@/lib/api";
import { Badge, Button, Card, Empty, ErrorNotice, Loader, SectionTitle, Stat, StatusPill } from "@/components/ui";
import { theme } from "@/lib/theme";
import { formatCurrency, relativeTime } from "@rjnx/shared";

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [featured, setFeatured] = React.useState<TournamentListItem[]>([]);
  const [live, setLive] = React.useState<TournamentListItem[]>([]);
  const [stats, setStats] = React.useState<Awaited<ReturnType<typeof fetchPlatformStats>>>(null);
  const [banner, setBanner] = React.useState<{ image_url: string; title: string } | null>(null);
  const [news, setNews] = React.useState<Awaited<ReturnType<typeof fetchNews>>>([]);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const [featuredRows, liveRows, statsRow, banners, newsRows] = await Promise.all([
        fetchTournaments({ limit: 6 }),
        fetchTournaments({ status: "live", limit: 4 }),
        fetchPlatformStats(),
        fetchBanners(),
        fetchNews(),
      ]);
      setFeatured(featuredRows);
      setLive(liveRows);
      setStats(statsRow);
      setBanner(banners.find((row) => row.placement === "home_hero") ?? banners[0] ?? null);
      setNews(newsRows.slice(0, 3));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the arena");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loader />;

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
          colors={[theme.colors.blue]}
        />
      }
    >
      {error ? <ErrorNotice message={error} onRetry={() => void load()} /> : null}

      <View style={styles.hero}>
        {banner?.image_url ? (
          <Image source={{ uri: absoluteAsset(banner.image_url) }} style={styles.heroImage} resizeMode="cover" />
        ) : null}
        <View style={styles.heroOverlay}>
          <Badge label={`Season 4 · ${stats?.live_tournaments ?? 0} live`} tone="pink" />
          <Text style={styles.heroTitle}>
            BE <Text style={{ color: theme.colors.blue }}>SAVAGE</Text>.{"\n"}NOT AVERAGE.
          </Text>
          <Text style={styles.heroSub}>
            Welcome back, {profile?.username ?? "player"}. {stats?.total_tournaments ?? 0} tournaments,{" "}
            {formatCurrency(stats?.total_prize_pool ?? 0)} in prizes.
          </Text>
          <Button label="Browse tournaments" onPress={() => router.push("/(app)/tournaments")} />
        </View>
      </View>

      <View style={styles.statRow}>
        <Stat label="Players" value={String(stats?.total_players ?? 0)} />
        <Stat label="Teams" value={String(stats?.total_teams ?? 0)} accent />
        <Stat label="Events" value={String(stats?.total_tournaments ?? 0)} />
      </View>

      {live.length ? (
        <>
          <SectionTitle title="Live now" action={<Badge label="● on air" tone="red" />} />
          {live.map((tournament) => (
            <TournamentRow key={tournament.id} tournament={tournament} onPress={() => router.push(`/tournament/${tournament.slug}`)} />
          ))}
        </>
      ) : null}

      <SectionTitle
        title="Open tournaments"
        action={
          <Pressable onPress={() => router.push("/(app)/tournaments")}>
            <Text style={styles.linkText}>View all →</Text>
          </Pressable>
        }
      />
      {featured.length ? (
        featured.map((tournament) => (
          <TournamentRow key={tournament.id} tournament={tournament} onPress={() => router.push(`/tournament/${tournament.slug}`)} />
        ))
      ) : (
        <Empty title="No tournaments yet" description="New events are published every week." />
      )}

      <SectionTitle
        title="Announcements"
        action={
          <Pressable onPress={() => router.push("/(app)/notifications")}>
            <Text style={styles.linkText}>Inbox →</Text>
          </Pressable>
        }
      />
      <Card>
        {news.length ? (
          news.map((article, index) => (
            <View key={article.id} style={[styles.newsRow, index > 0 && styles.newsDivider]}>
              <Text style={styles.newsTitle}>{article.title}</Text>
              <Text style={styles.newsMeta}>{relativeTime(article.published_at)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No announcements yet.</Text>
        )}
      </Card>

      <Card style={{ marginTop: 4 }}>
        <Text style={styles.cardTitle}>Quick actions</Text>
        <View style={styles.quickRow}>
          <Button label="My matches" variant="secondary" onPress={() => router.push("/(app)/matches")} style={{ flex: 1 }} />
          <Button label="Teams" variant="secondary" onPress={() => router.push("/(app)/teams")} style={{ flex: 1 }} />
        </View>
        <View style={styles.quickRow}>
          <Button label="Support" variant="secondary" onPress={() => router.push("/(app)/support")} style={{ flex: 1 }} />
          <Button label="Settings" variant="secondary" onPress={() => router.push("/(app)/settings")} style={{ flex: 1 }} />
        </View>
        {user?.email ? <Text style={styles.muted}>Signed in as {user.email}</Text> : null}
      </Card>
    </ScrollView>
  );
}

function absoluteAsset(url: string) {
  if (url.startsWith("http")) return url;
  const base = process.env.EXPO_PUBLIC_SITE_URL ?? "https://rjnxgamingesports.com";
  return `${base}${url}`;
}

function TournamentRow({ tournament, onPress }: { tournament: TournamentListItem; onPress: () => void }) {
  const remaining = Math.max(0, tournament.max_slots - (tournament.slots?.taken ?? 0));
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.tournamentCard}>
        <View style={styles.tournamentHeader}>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.tournamentName} numberOfLines={2}>
              {tournament.name}
            </Text>
            <Text style={styles.tournamentMeta}>
              {tournament.game?.short_name ?? "RJNX"} · {tournament.mode.toUpperCase()} · {formatCurrency(tournament.prize_pool)}
            </Text>
          </View>
          <StatusPill status={tournament.status} />
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, Math.round(((tournament.slots?.taken ?? 0) / Math.max(1, tournament.max_slots)) * 100))}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.tournamentFooter}>
          {tournament.entry_fee > 0 ? `${formatCurrency(tournament.entry_fee)} entry` : "Free entry"} · {remaining} slots left ·{" "}
          {relativeTime(tournament.starts_at)}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 14, paddingBottom: 40, gap: 12 },
  hero: { borderRadius: theme.radius.lg, overflow: "hidden", backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.line },
  heroImage: { width: "100%", height: 150, opacity: 0.55 },
  heroOverlay: { padding: 16, gap: 8, marginTop: -46 },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "900", letterSpacing: 0.5, lineHeight: 30 },
  heroSub: { color: "rgba(255,255,255,0.6)", fontSize: 12, lineHeight: 17 },
  statRow: { flexDirection: "row", gap: 8 },
  tournamentCard: { gap: 8 },
  tournamentHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tournamentName: { color: "#fff", fontSize: 13, fontWeight: "800", letterSpacing: 0.4 },
  tournamentMeta: { color: theme.colors.muted, fontSize: 10, letterSpacing: 1 },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: theme.colors.blue },
  tournamentFooter: { color: "rgba(255,255,255,0.4)", fontSize: 10 },
  linkText: { color: theme.colors.blue, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  newsRow: { paddingVertical: 6 },
  newsDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.line },
  newsTitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },
  newsMeta: { color: "rgba(255,255,255,0.3)", fontSize: 9, letterSpacing: 1, marginTop: 2 },
  muted: { color: theme.colors.muted, fontSize: 11 },
  cardTitle: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 1.6, marginBottom: 10 },
  quickRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
});
