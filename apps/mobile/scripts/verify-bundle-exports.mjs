#!/usr/bin/env node
/**
 * Static guard for the class of bug that crashed the release APK:
 * Expo Router treats a named export called `ErrorBoundary` in any route module
 * (every file under app/) as its OWN route error boundary and renders it through
 * `<Try catch={ErrorBoundary}>` — i.e. as a component. A single stray import
 * named `ErrorBoundary` therefore becomes a route-level boundary and the app
 * dies at startup with
 *
 *   TypeError: Cannot read property 'ErrorBoundary' of undefined
 *
 * This script fails the build when a route module:
 *   - exports or imports a binding named `ErrorBoundary`
 *   - has no default export (router renders nothing)
 *   - re-exports a wildcard module from app/ (breaks the route manifest)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const appDir = path.join(projectRoot, "app");
const failures = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(tsx|jsx|ts|js)$/.test(full) && !/\.d\.ts$/.test(full)) inspect(full);
  }
}

function inspect(file) {
  const code = readFileSync(file, "utf8");
  const rel = path.relative(projectRoot, file);

  if (/\bexport\s+(?:default\s+)?(?:class|function|const)\s+ErrorBoundary\b/.test(code)) {
    failures.push(`${rel}: exports "ErrorBoundary" — expo-router would treat it as a route boundary`);
  }
  // `import { ErrorBoundary as Alias }` is safe; the local binding name is what
  // matters, so only flag imports that keep the literal name.
  for (const match of code.matchAll(/\bimport\s*\{([^}]*)\}\s*from/g)) {
    for (const specifier of match[1].split(",")) {
      const [imported, local] = specifier.split(/\s+as\s+/).map((part) => part.trim());
      if (!imported) continue;
      const binding = (local ?? imported).replace(/^type\s+/, "");
      if (binding === "ErrorBoundary") {
        failures.push(
          `${rel}: local binding "ErrorBoundary" from an import — expo-router treats a route export by that name as its own boundary; alias it (e.g. UiErrorBoundary)`,
        );
      }
    }
  }
  if (/\bexport\s+\*\s+from/.test(code)) {
    failures.push(`${rel}: wildcard re-export inside app/ breaks the route manifest`);
  }
  if (!/\bexport\s+(default|const\s+unstable_settings)/.test(code) && !/_layout\.(tsx|jsx|ts|js)$/.test(file)) {
    if (!/\bexport\s+default\b/.test(code)) failures.push(`${rel}: missing default export`);
  }
}

walk(appDir);

if (failures.length) {
  console.error("✗ route module check failed:");
  for (const failure of failures) console.error(`  • ${failure}`);
  process.exit(1);
}
console.log("✓ route modules clean: no stray ErrorBoundary exports/imports, every screen has a default export");
