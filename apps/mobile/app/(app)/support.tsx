import * as React from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Linking } from "react-native";
import { useAuth } from "@/lib/auth";
import { createSupportTicket, fetchMyTickets } from "@/lib/api";
import { Badge, Button, Card, Empty, ErrorNotice, Field, Loader, SectionTitle } from "@/components/ui";
import { theme } from "@/lib/theme";
import { formatDate } from "@rjnx/shared";

const CATEGORIES = ["account", "tournament", "payment", "technical", "other"] as const;

export default function SupportScreen() {
  const { user } = useAuth();
  const [tickets, setTickets] = React.useState<Awaited<ReturnType<typeof fetchMyTickets>>>([]);
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [category, setCategory] = React.useState<string>("account");
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!user) return;
    try {
      setTickets(await fetchMyTickets(user.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load tickets");
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!user) return;
    if (subject.trim().length < 4 || message.trim().length < 10) {
      Alert.alert("Almost there", "Add a subject (4+ chars) and describe the issue (10+ chars).");
      return;
    }
    setBusy(true);
    try {
      await createSupportTicket({ userId: user.id, subject: subject.trim(), category, message: message.trim() });
      setSubject("");
      setMessage("");
      await load();
      Alert.alert("Ticket created", "Our team replies inside the app and by email.");
    } catch (caught) {
      Alert.alert("Could not submit", caught instanceof Error ? caught.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader label="Loading support…" />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.headline}>WE ANSWER FAST.</Text>
      <Text style={styles.sub}>Average first reply under 12 hours. Include your game UID for match issues.</Text>

      <Card style={{ gap: 10 }}>
        <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="Short summary" />
        <Text style={styles.fieldLabel}>CATEGORY</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((item) => (
            <Button
              key={item}
              label={item}
              variant={category === item ? "primary" : "secondary"}
              onPress={() => setCategory(item)}
              style={{ flex: 1 }}
            />
          ))}
        </View>
        <Field
          label="Message"
          value={message}
          onChangeText={setMessage}
          placeholder="What happened?"
          multiline
          numberOfLines={5}
          style={{ minHeight: 100, textAlignVertical: "top" }}
        />
        <Button label="Submit ticket" loading={busy} onPress={() => void submit()} />
        <Button
          label="Email support@rjnxgamingesports.com"
          variant="ghost"
          onPress={() => void Linking.openURL("mailto:support@rjnxgamingesports.com")}
        />
      </Card>

      <SectionTitle title="My tickets" action={<Badge label={String(tickets.length)} />} />
      {error ? <ErrorNotice message={error} onRetry={() => void load()} /> : null}
      {tickets.length ? (
        tickets.map((ticket) => (
          <Card key={ticket.id} style={{ gap: 6 }}>
            <View style={styles.rowBetween}>
              <Text style={styles.ticketSubject}>{ticket.subject}</Text>
              <Badge label={ticket.status} tone={ticket.status === "open" ? "amber" : ticket.status === "resolved" ? "green" : "blue"} />
            </View>
            <Text style={styles.ticketBody}>{ticket.message}</Text>
            {ticket.admin_reply ? (
              <View style={styles.reply}>
                <Text style={styles.replyLabel}>SUPPORT REPLY</Text>
                <Text style={styles.replyBody}>{ticket.admin_reply}</Text>
              </View>
            ) : null}
            <Text style={styles.time}>{formatDate(ticket.created_at)}</Text>
          </Card>
        ))
      ) : (
        <Empty title="No tickets yet" description="Anything broken or unfair? Open a ticket and we investigate." />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 14, paddingBottom: 48, gap: 10 },
  headline: { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: 1 },
  sub: { color: theme.colors.muted, fontSize: 11, lineHeight: 16 },
  fieldLabel: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: "700", letterSpacing: 1.6 },
  chipRow: { flexDirection: "row", gap: 5 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  ticketSubject: { color: "#fff", fontSize: 12, fontWeight: "700", flex: 1 },
  ticketBody: { color: "rgba(255,255,255,0.65)", fontSize: 11, lineHeight: 16 },
  reply: { backgroundColor: "rgba(0,207,255,0.07)", borderRadius: theme.radius.sm, padding: 8, gap: 3 },
  replyLabel: { color: theme.colors.blue, fontSize: 8, fontWeight: "800", letterSpacing: 1.6 },
  replyBody: { color: "rgba(255,255,255,0.8)", fontSize: 11, lineHeight: 16 },
  time: { color: "rgba(255,255,255,0.3)", fontSize: 9 },
});
