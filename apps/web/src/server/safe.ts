import "server-only";

/**
 * Wraps a data loader so a database/network outage degrades the page instead of
 * throwing a 500. Every public page renders with empty state and the global
 * error boundary is reserved for genuine programming errors.
 *
 * The failure is logged once with a stable tag so Vercel logs stay readable.
 */
export async function safeQuery<T>(tag: string, loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    console.error(`[rjnx:${tag}] query failed:`, error instanceof Error ? error.message : error);
    return fallback;
  }
}
