// Metro config that lets the app import the shared TypeScript package.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the monorepo so edits in packages/shared hot-reload, but never walk
// node_modules (that is the single biggest cause of memory blow-ups in CI).
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = false;
config.resolver.unstable_enablePackageExports = true;

// Cap Metro's worker pool: the CI runner has 2 vCPUs, and unbounded workers are
// the usual cause of the OOM/timeout failures in monorepo Android builds.
config.maxWorkers = Math.max(1, Math.min(4, Number(process.env.EXPO_METRO_MAX_WORKERS || 4)));

module.exports = config;
