/**
 * src/lib/chatWallpaper.ts
 * 채팅방 배경(꾸미기) — 방별로 로컬 저장 (SecureStore)
 */
import * as SecureStore from "expo-secure-store";

const keyFor = (roomId: string) => `chatwall-${roomId.replace(/[^A-Za-z0-9._-]/g, "")}`;

// 선택 가능한 배경 프리셋 (기본 = null)
export const WALLPAPER_PRESETS: { label: string; color: string | null }[] = [
  { label: "기본", color: null },
  { label: "연하늘", color: "#E3F2FD" },
  { label: "연보라", color: "#EDE7F6" },
  { label: "연그린", color: "#E8F5E9" },
  { label: "크림", color: "#FFF8E1" },
  { label: "핑크", color: "#FCE4EC" },
  { label: "그레이", color: "#ECEFF1" },
  { label: "다크", color: "#1E1E1E" },
];

export async function getWallpaper(roomId: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(keyFor(roomId));
  } catch {
    return null;
  }
}

export async function setWallpaper(roomId: string, color: string | null): Promise<void> {
  try {
    if (color) await SecureStore.setItemAsync(keyFor(roomId), color);
    else await SecureStore.deleteItemAsync(keyFor(roomId));
  } catch {
    // noop
  }
}
