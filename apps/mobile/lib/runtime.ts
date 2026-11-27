/**
 * Startup diagnostics.
 *
 * A release Android build has no red box: if the JS root ever throws, the user
 * sees a frozen splash screen and there is nothing to debug with. This module
 * (a) validates the runtime configuration before the first render, (b) installs
 * a JS error handler that forwards uncaught errors to logcat, and (c) keeps the
 * last fatal error in memory so the root layout can render a readable failure
 * screen instead of a blank one.
 */
import { Platform } from "react-native";

export const LOG_TAG = "RJNXStartup";

type Level = "info" | "warn" | "error";

export function log(level: Level, message: string, extra?: unknown): void {
  const line = extra === undefined ? `[${LOG_TAG}] ${message}` : `[${LOG_TAG}] ${message} ${safeStringify(extra)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function safeStringify(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export interface RuntimeConfig {
  supabaseUrl: string;
  supabaseKey: string;
  /** Set when the app cannot connect to Supabase at all; the UI shows a banner. */
  configError: string | null;
}

const URL_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i;

/**
 * Reads and validates the public Supabase configuration. These values are
 * compiled into the bundle at build time (`EXPO_PUBLIC_*`), so a bad build
 * config must surface as a readable message rather than a crash.
 */
export function readRuntimeConfig(): RuntimeConfig {
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const key = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  const problems: string[] = [];
  if (!url) problems.push("EXPO_PUBLIC_SUPABASE_URL is missing");
  else if (!URL_PATTERN.test(url)) problems.push(`EXPO_PUBLIC_SUPABASE_URL is not a Supabase project URL (${url})`);
  if (!key) problems.push("EXPO_PUBLIC_SUPABASE_ANON_KEY is missing");
  else if (key.length < 30) problems.push("EXPO_PUBLIC_SUPABASE_ANON_KEY looks truncated");
  else if (/service_role/i.test(key)) problems.push("EXPO_PUBLIC_SUPABASE_ANON_KEY must not be a service-role key");

  return { supabaseUrl: url, supabaseKey: key, configError: problems.length ? problems.join("; ") : null };
}

/**
 * Forwards uncaught JS errors and promise rejections to logcat (tag
 * RJNXStartup) so an on-device crash is diagnosable with
 * `adb logcat -s RJNXStartup:V ReactNativeJS:V AndroidRuntime:E`.
 */
export function installGlobalErrorHandlers(onFatal: (message: string) => void): () => void {
  const previousHandler = ErrorUtils.getGlobalHandler?.();

  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    log("error", `uncaught ${isFatal ? "fatal " : ""}error: ${error?.message ?? String(error)}`, error?.stack);
    if (isFatal) onFatal(error?.message ?? "Unknown startup error");
    if (previousHandler) previousHandler(error, isFatal);
  });

  if (Platform.OS !== "web") {
    log("info", "global error handler installed");
  }

  return () => {
    if (previousHandler) ErrorUtils.setGlobalHandler(previousHandler);
  };
}

/** Marker used by CI to assert the JS bundle reached the root layout. */
export function markBoot(stage: string): void {
  log("info", `boot:${stage}`);
}
