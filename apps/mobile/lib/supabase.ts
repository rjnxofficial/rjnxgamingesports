import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

import { log, readRuntimeConfig } from "./runtime";

export const RJNX_SCHEMA = "rjnx";

/**
 * Configuration comes from the build environment only (`EXPO_PUBLIC_*`).
 * There is deliberately no hard-coded fallback project: a bundle built without
 * configuration must fail loudly at startup diagnostics instead of silently
 * talking to a guessed project.
 */
const runtimeConfig = readRuntimeConfig();
const SUPABASE_URL = runtimeConfig.supabaseUrl;
const SUPABASE_ANON_KEY = runtimeConfig.supabaseKey;

if (runtimeConfig.configError) {
  log("error", `invalid Supabase configuration — ${runtimeConfig.configError}`);
}

/** True when the bundle has a usable Supabase configuration. */
export const hasSupabaseConfig = runtimeConfig.configError === null;

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
    } catch (error) {
      // Keystore unavailable on this device — use the AsyncStorage copy.
      log("warn", "secure-store read failed, falling back to AsyncStorage", error);
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      log("warn", "AsyncStorage read failed", error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (value.length <= SECURE_STORE_LIMIT) {
      try {
        await SecureStore.setItemAsync(key, value);
        await AsyncStorage.removeItem(key);
        return;
      } catch (error) {
        log("warn", "secure-store write failed, falling back to AsyncStorage", error);
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

// The auth storage adapters below still work when the URL is empty (they are
// only touched on a session read), so the client is always constructible and the
// UI can render a configuration error instead of crashing at import time.
export const supabase = createClient(SUPABASE_URL || "https://unconfigured.supabase.co", SUPABASE_ANON_KEY || "unconfigured", {
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

log("info", `supabase client created for ${SUPABASE_URL || "(no url)"} · config=${hasSupabaseConfig ? "ok" : "invalid"}`);
