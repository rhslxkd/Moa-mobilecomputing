/**
 * src/hooks/useTheme.ts
 *
 * 시스템 다크모드를 감지해서 맞는 팔레트를 반환하는 훅
 *
 * 사용법:
 *   const C = useTheme();
 *   <View style={{ backgroundColor: C.bgCard }} />
 *   <Text style={{ color: C.text }} />
 */

import { useColorScheme } from "react-native";
import { LIGHT, DARK, type Theme } from "../constants/theme";

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "dark" ? DARK : LIGHT;
}

/**
 * 다크모드 여부만 필요할 때
 *
 * 사용법:
 *   const isDark = useIsDark();
 */
export function useIsDark(): boolean {
  return useColorScheme() === "dark";
}