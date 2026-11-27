/** RJNX design tokens for React Native. Mirrors the web palette. */
export const theme = {
  colors: {
    bg: "#05050A",
    surface: "#0E0E16",
    panel: "#12121D",
    line: "rgba(255,255,255,0.08)",
    blue: "#00CFFF",
    purple: "#8B5CFF",
    pink: "#FF2ED1",
    red: "#FF3B3B",
    green: "#35E6A3",
    amber: "#FFC857",
    text: "#FFFFFF",
    muted: "#8A8AA3",
  },
  radius: { sm: 8, md: 12, lg: 18, pill: 999 },
  spacing: (value: number) => value * 4,
  fonts: {
    // Orbitron/Rajdhani are loaded as bundles via expo-font in production builds;
    // these fallbacks keep the UI readable when the bundle is absent.
    display: "Orbitron_700Bold",
    body: "Rajdhani_500Medium",
  },
} as const;

export const gradients = {
  primary: ["#00CFFF", "#8B5CFF", "#FF2ED1"] as const,
  panel: ["rgba(18,18,29,0.96)", "rgba(10,10,18,0.9)"] as const,
};
