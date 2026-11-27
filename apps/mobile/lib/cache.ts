/**
 * Tiny offline cache: every read the app makes is mirrored to AsyncStorage so a
 * cold start with no connectivity still renders the last known arena state.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "rjnx.cache.v1:";
const memory = new Map<string, unknown>();

export async function readCache<T>(key: string): Promise<T | null> {
  if (memory.has(key)) return memory.get(key) as T;
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const value = JSON.parse(raw) as { data: T; at: number };
    memory.set(key, value.data);
    return value.data;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, data: T): Promise<void> {
  memory.set(key, data);
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ data, at: Date.now() }));
  } catch {
    // Storage full or unavailable — the in-memory copy still serves this session.
  }
}

export async function cached<T>(key: string, loader: () => Promise<T>): Promise<{ data: T | null; stale: boolean; error: string | null }> {
  try {
    const data = await loader();
    await writeCache(key, data);
    return { data, stale: false, error: null };
  } catch (caught) {
    const fallback = await readCache<T>(key);
    return {
      data: fallback,
      stale: Boolean(fallback),
      error: caught instanceof Error ? caught.message : "Network error",
    };
  }
}

export async function clearCache(): Promise<void> {
  memory.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(PREFIX)));
  } catch {
    // ignore — worst case stale entries expire on next successful fetch
  }
}
