/**
 * Shared database-schema constant.
 *
 * This lives in its own module on purpose: `client.ts` is a `"use client"`
 * module, and importing a value from it into server code turns the whole
 * module into a client reference at runtime (Next.js then throws
 * "Attempted to call RJNX_SCHEMA() from the server but RJNX_SCHEMA is on the
 * client"). Keep the constant free of any client-only imports.
 */
export const RJNX_SCHEMA = "rjnx" as const;
