import { useFonts } from "expo-font";

/**
 * Brand typography. Files are bundled (assets/fonts) so the app renders the
 * RJNX type system offline on first launch — no runtime download.
 */
export const fontAssets = {
  Orbitron_700Bold: require("../assets/fonts/Orbitron_700Bold.ttf"),
  Orbitron_900Black: require("../assets/fonts/Orbitron_900Black.ttf"),
  Rajdhani_400Regular: require("../assets/fonts/Rajdhani_400Regular.ttf"),
  Rajdhani_500Medium: require("../assets/fonts/Rajdhani_500Medium.ttf"),
  Rajdhani_700Bold: require("../assets/fonts/Rajdhani_700Bold.ttf"),
};

export function useBrandFonts() {
  const [loaded, error] = useFonts(fontAssets);
  return { loaded, error };
}
