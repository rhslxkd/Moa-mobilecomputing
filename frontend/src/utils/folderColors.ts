/**
 * 폴더 색상 영구 저장 유틸리티
 * - expo-secure-store 기반 (앱 재시작 후에도 유지)
 */
import * as SecureStore from "expo-secure-store";

const COLORS_KEY = "moa_folder_colors_v1";
const colorCache: Record<string, string> = {};

export const FOLDER_PALETTE = [
  { color: "#00A9EC", label: "파란색" },
  { color: "#7C3AED", label: "보라색" },
  { color: "#16A34A", label: "초록색" },
  { color: "#E2B93B", label: "노란색" },
  { color: "#EF4444", label: "빨간색" },
  { color: "#EC4899", label: "분홍색" },
  { color: "#F97316", label: "주황색" },
  { color: "#6B7280", label: "회색" },
];

export async function loadAllFolderColors(): Promise<Record<string, string>> {
  try {
    const raw = await SecureStore.getItemAsync(COLORS_KEY);
    if (raw) Object.assign(colorCache, JSON.parse(raw));
  } catch {}
  return { ...colorCache };
}

export async function saveFolderColor(id: string, color: string): Promise<void> {
  colorCache[id] = color;
  try {
    await SecureStore.setItemAsync(COLORS_KEY, JSON.stringify(colorCache));
  } catch {}
}

export function getFolderColor(id: string, defaultColor = "#00A9EC"): string {
  return colorCache[id] ?? defaultColor;
}
