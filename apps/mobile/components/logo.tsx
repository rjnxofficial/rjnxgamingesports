import * as React from "react";
import { View, Text } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { theme } from "@/lib/theme";

export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Defs>
        <LinearGradient id="rjnx" x1="0" y1="0" x2="1024" y2="1024">
          <Stop offset="0" stopColor="#00CFFF" />
          <Stop offset="0.5" stopColor="#8B5CFF" />
          <Stop offset="1" stopColor="#FF2ED1" />
        </LinearGradient>
      </Defs>
      <Path d="M512 168 806 338v340L512 848 218 678V338L512 168Z" fill="#05050A" stroke="url(#rjnx)" strokeWidth={18} />
      <Path d="M352 700V330h158c76 0 124 44 124 112 0 52-28 88-72 102l80 156h-98l-74-142h-42v142h-76Zm76-206h64c32 0 52-18 52-46s-20-46-52-46h-64v92Z" fill="url(#rjnx)" />
      <Rect x={640} y={330} width={92} height={150} fill="url(#rjnx)" />
      <Rect x={640} y={520} width={92} height={180} fill="#FF2ED1" opacity={0.92} />
    </Svg>
  );
}

export function Logo({ size = 44, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <LogoMark size={size} />
      {compact ? null : (
        <View>
          <Text style={{ color: "#fff", fontSize: 15, fontWeight: "900", letterSpacing: 4 }}>RJNX</Text>
          <Text style={{ color: theme.colors.blue, fontSize: 8, fontWeight: "700", letterSpacing: 3 }}>
            GAMING ESPORTS
          </Text>
        </View>
      )}
    </View>
  );
}
