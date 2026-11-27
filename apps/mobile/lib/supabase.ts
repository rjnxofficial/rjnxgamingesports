import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

export const RJNX_SCHEMA = "rjnx";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://nuckewrlcjphjmnfgilo.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_bj2iYWHvILa6__h5bZrsmA_F2CPG1gj";

/**
 * Secure session persistence: tokens go to the Android Keystore via
 * expo-secure-store, with AsyncStorage as a fallback for large values.
 */
/**
 * SecureStore rejects values above ~2 KB on Android, and a Supabase session
 * (JWT + refresh token + user payload) frequently exceeds that. Small values
 * stay in the Keystore; oversized ones are delegated to AsyncStorage under the
 * same key so reads and writes always agree.
 */
const SECURE_STORE_LIMIT = 2000;

const SecureAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const secure = await SecureStore.getItemAsync(key);
      if (secure !== null) return secure;
    } catch {
      // Keystore unavailable on this device — use the AsyncStorage copy.
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (value.length <= SECURE_STORE_LIMIT) {
      try {
        await SecureStore.setItemAsync(key, value);
        await AsyncStorage.removeItem(key);
        return;
      } catch {
        // fall through to AsyncStorage
      }
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // nothing stored there — fine
    }
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
    await AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: RJNX_SCHEMA },
  auth: {
    storage: SecureAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Keep the session fresh only while the app is in the foreground.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export type MobileSupabaseClient = SupabaseClient<any, "rjnx", any>;
