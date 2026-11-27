/**
 * Expo config plugin: ships the Orbitron/Rajdhani TTFs inside the native
 * project instead of leaving `expo-font`'s CLI-driven asset copy to chance.
 *
 * `expo-font` normally copies `assets/fonts` into `android/app/src/main/assets/fonts`
 * via a prebuild hook, but that path is derived from the *project root* and is
 * easy to lose in a monorepo. Registering the files explicitly keeps the release
 * build deterministic: the fonts are plain Android assets and load through
 * `useFonts(require(...))` at runtime.
 *
 * Nothing here touches signing, manifest or gradle files.
 */
const { withDangerousMod, withPlugins } = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const FONT_FILES = [
  "Orbitron_700Bold.ttf",
  "Orbitron_900Black.ttf",
  "Rajdhani_400Regular.ttf",
  "Rajdhani_500Medium.ttf",
  "Rajdhani_700Bold.ttf",
];

function withBrandFonts(config) {
  return withPlugins(config, [
    (cfg) =>
      withDangerousMod(cfg, [
        "android",
        async (mod) => {
          const projectRoot = mod.modRequest.projectRoot;
          const source = path.join(projectRoot, "assets", "fonts");
          const target = path.join(
            projectRoot,
            "android",
            "app",
            "src",
            "main",
            "assets",
            "fonts",
          );

          if (!fs.existsSync(source)) {
            console.warn(`[with-brand-fonts] font directory missing: ${source}`);
            return mod;
          }

          fs.mkdirSync(target, { recursive: true });
          for (const file of FONT_FILES) {
            const from = path.join(source, file);
            if (!fs.existsSync(from)) {
              throw new Error(`[with-brand-fonts] expected font asset ${file} in ${source}`);
            }
            fs.copyFileSync(from, path.join(target, file));
          }
          console.log(`[with-brand-fonts] copied ${FONT_FILES.length} fonts to android assets`);
          return mod;
        },
      ]),
  ]);
}

module.exports = withBrandFonts;
