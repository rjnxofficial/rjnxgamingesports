import * as React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Logo } from "./logo";
import { theme } from "@/lib/theme";
import { log } from "@/lib/runtime";

interface Props {
  children: React.ReactNode;
  /** Optional extra context, e.g. "root" or a screen name, for logcat greps. */
  scope?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches render/lifecycle errors so a broken subtree degrades to a readable
 * diagnostic screen instead of a white window. The message is also written to
 * logcat under RJNXStartup, which is what the CI emulator smoke test greps for.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    log("error", `${this.props.scope ?? "app"} render error: ${error.message}`, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.container}>
        <Logo size={64} />
        <Text style={styles.title}>THE ARENA HIT AN ERROR</Text>
        <Text style={styles.text}>
          RJNX could not render this screen. The details below are also logged to the device log for support.
        </Text>
        <ScrollView style={styles.detailBox} contentContainerStyle={styles.detailContent}>
          <Text style={styles.detail} selectable>
            {error.name}: {error.message}
          </Text>
        </ScrollView>
        <Text style={styles.retry} onPress={this.reset}>
          TRY AGAIN
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  title: { color: "#fff", fontSize: 14, fontWeight: "900", letterSpacing: 2, textAlign: "center" },
  text: { color: theme.colors.muted, fontSize: 12, textAlign: "center", lineHeight: 18 },
  detailBox: {
    maxHeight: 180,
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.surface,
  },
  detailContent: { padding: 12 },
  detail: { color: theme.colors.amber, fontSize: 11, fontFamily: "monospace" },
  retry: {
    color: theme.colors.blue,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: theme.colors.blue,
    borderRadius: 999,
    overflow: "hidden",
  },
});
