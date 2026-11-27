import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as Linking from "expo-linking";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { registerPushToken } from "./api";

const EAS_PROJECT_ID =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
  (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
  "";

/** True when a real EAS project id is configured (not the placeholder). */
function hasRealProjectId(): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(EAS_PROJECT_ID) &&
    !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(EAS_PROJECT_ID);
}

/** Show alerts even while the app is foregrounded. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

/** Requests permission and registers the device token with Supabase. */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("rjnx", {
      name: "RJNX match alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#00CFFF",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return null;

  if (!hasRealProjectId()) {
    // Without an EAS project id Expo cannot mint a push token; the in-app inbox
    // still works, so we skip silently instead of failing the login flow.
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
    await registerPushToken(userId, token.data);
    return token.data;
  } catch {
    return null;
  }
}

/**
 * Deep-link handler: a notification tap opens the in-app path stored in
 * `data.link` (e.g. /dashboard/matches becomes /matches).
 */
export function useNotificationObserver() {
  return () => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const link = response.notification.request.content.data?.link;
      if (typeof link === "string" && link.length) {
        const path = link
          .replace("/dashboard/matches", "/matches")
          .replace("/dashboard/notifications", "/notifications")
          .replace("/dashboard/tournaments", "/tournaments")
          .replace("/dashboard/teams", "/teams")
          .replace("/dashboard", "/profile");
        void Linking.openURL(Linking.createURL(path));
      }
    });
    return () => subscription.remove();
  };
}
