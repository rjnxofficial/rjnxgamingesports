import * as React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "@/lib/theme";

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  if (!scroll) {
    return <View style={[styles.screen, contentStyle]}>{children}</View>;
  }
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.screenContent, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            tintColor={theme.colors.blue}
            colors={[theme.colors.blue]}
            progressBackgroundColor={theme.colors.surface}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {action}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}) {
  const isDisabled = disabled || loading;
  const content = (
    <View style={styles.buttonInner}>
      {loading ? <ActivityIndicator size="small" color={variant === "primary" ? "#05050A" : theme.colors.blue} /> : icon}
      <Text
        style={[
          styles.buttonLabel,
          variant === "primary" && styles.buttonLabelPrimary,
          variant === "secondary" && styles.buttonLabelSecondary,
          variant === "danger" && styles.buttonLabelDanger,
          variant === "ghost" && styles.buttonLabelGhost,
        ]}
      >
        {label}
      </Text>
    </View>
  );

  if (variant === "primary") {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={[styles.wrapper, isDisabled && styles.disabled, style]}>
        <LinearGradient
          colors={["#00CFFF", "#8B5CFF", "#FF2ED1"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        styles.buttonOutline,
        variant === "danger" && styles.buttonDanger,
        variant === "ghost" && styles.buttonGhost,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <TextInput
        placeholderTextColor="rgba(255,255,255,0.28)"
        style={[styles.input, error ? styles.inputError : null]}
        {...props}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Badge({ label, tone = "neutral" }: { label: string; tone?: "blue" | "purple" | "pink" | "green" | "amber" | "red" | "neutral" }) {
  const map = {
    blue: { bg: "rgba(0,207,255,0.12)", fg: theme.colors.blue },
    purple: { bg: "rgba(139,92,255,0.14)", fg: theme.colors.purple },
    pink: { bg: "rgba(255,46,209,0.14)", fg: theme.colors.pink },
    green: { bg: "rgba(53,230,163,0.14)", fg: theme.colors.green },
    amber: { bg: "rgba(255,200,87,0.14)", fg: theme.colors.amber },
    red: { bg: "rgba(255,59,59,0.14)", fg: theme.colors.red },
    neutral: { bg: "rgba(255,255,255,0.07)", fg: "rgba(255,255,255,0.7)" },
  } as const;
  const colors = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.fg }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "live" || status === "registration_open"
      ? "green"
      : status === "pending" || status === "registration_closed"
        ? "amber"
        : status === "rejected" || status === "cancelled"
          ? "red"
          : status === "room_published"
            ? "purple"
            : "blue";
  return <Badge label={status.replace(/_/g, " ")} tone={tone as never} />;
}

export function Empty({ title, description, icon }: { title: string; description?: string; icon?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      {icon}
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
    </View>
  );
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={styles.errorCard}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? <Button label="Retry" variant="secondary" onPress={onRetry} style={{ marginTop: 12 }} /> : null}
    </Card>
  );
}

export function Loader({ label = "Loading arena…" }: { label?: string }) {
  return (
    <View style={styles.loader}>
      <ActivityIndicator color={theme.colors.blue} />
      <Text style={styles.loaderText}>{label}</Text>
    </View>
  );
}

export function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, accent && { color: theme.colors.blue }]}>{value}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  screenContent: { padding: 16, paddingBottom: 40, gap: 14 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.line,
    padding: 14,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  sectionTitle: { color: "#fff", fontSize: 12, fontWeight: "800", letterSpacing: 2 },
  wrapper: { borderRadius: theme.radius.sm, overflow: "hidden" },
  button: { borderRadius: theme.radius.sm, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  buttonInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  buttonOutline: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  buttonDanger: { borderColor: "rgba(255,59,59,0.4)", backgroundColor: "rgba(255,59,59,0.08)" },
  buttonGhost: { backgroundColor: "transparent", borderWidth: 0 },
  buttonLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 1.5 },
  buttonLabelPrimary: { color: "#05050A" },
  buttonLabelSecondary: { color: "#fff" },
  buttonLabelDanger: { color: theme.colors.red },
  buttonLabelGhost: { color: "rgba(255,255,255,0.6)" },
  disabled: { opacity: 0.5 },
  field: { gap: 6 },
  fieldLabel: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: "700", letterSpacing: 1.6 },
  input: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#fff",
    fontSize: 14,
  },
  inputError: { borderColor: "rgba(255,59,59,0.6)" },
  fieldError: { color: theme.colors.red, fontSize: 11 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.radius.pill, alignSelf: "flex-start" },
  badgeText: { fontSize: 8, fontWeight: "800", letterSpacing: 1.2 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 28, paddingHorizontal: 16 },
  emptyTitle: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "700", letterSpacing: 1, textAlign: "center" },
  emptyDescription: { color: theme.colors.muted, fontSize: 12, textAlign: "center", lineHeight: 18 },
  errorCard: { borderColor: "rgba(255,59,59,0.35)", backgroundColor: "rgba(255,59,59,0.07)" },
  errorTitle: { color: theme.colors.red, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  errorText: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4 },
  loader: { paddingVertical: 48, alignItems: "center", gap: 10 },
  loaderText: { color: theme.colors.muted, fontSize: 11, letterSpacing: 1.4 },
  stat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: theme.radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  statLabel: { color: "rgba(255,255,255,0.35)", fontSize: 7, letterSpacing: 1.2 },
  statValue: { color: "#fff", fontSize: 14, fontWeight: "800", marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.line, marginVertical: 10 },
});
