import * as React from "react";
import { StyleSheet, Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { theme } from "@/lib/theme";

/** Slim strip shown whenever the device has no usable connection. */
export function OfflineBanner() {
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false || state.isInternetReachable === false);
    });
    return () => unsubscribe();
  }, []);

  if (!offline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>OFFLINE · SHOWING CACHED ARENA DATA</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: "rgba(255,200,87,0.14)", paddingVertical: 5, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,200,87,0.4)" },
  text: { color: theme.colors.amber, fontSize: 9, fontWeight: "800", letterSpacing: 1.4, textAlign: "center" },
});
