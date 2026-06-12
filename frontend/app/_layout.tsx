/**
 * app/_layout.tsx
 *
 * Expo Router 루트 레이아웃
 * - Provider들을 여기서 감쌈
 * - 폰트 로딩, 스플래시 스크린 처리
 *
 * 설치:
 *   npx expo install expo-font expo-splash-screen
 */

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// 스플래시 스크린 자동 숨김 방지 (폰트 로딩 후 직접 숨김)
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  // 네이티브 스플래시는 Splashscreen.tsx가 마운트된 뒤 숨김
  // → Splashscreen.tsx의 useEffect에서 SplashScreen.hideAsync() 호출

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
      <ProjectProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            gestureDirection: "horizontal",
            animation: "slide_from_right",
          }}
        >
          {/* 앱 진입점 */}
          <Stack.Screen name="index" />
          {/* 온보딩 */}
          <Stack.Screen name="(onboarding)/Splashscreen" />
          <Stack.Screen name="(onboarding)/signin" />
          <Stack.Screen name="(onboarding)/signup" />
          <Stack.Screen name="(onboarding)/usersetup" />
          <Stack.Screen name="(onboarding)/find-account" />
          <Stack.Screen name="(onboarding)/welcome" options={{ gestureEnabled: false }} />
          {/* 탭바 */}
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
          {/* 채팅 */}
          <Stack.Screen name="(screens)/chat/[projectId]" options={{ presentation: "card" }} />
          <Stack.Screen name="(screens)/chat/ChatMenu"    options={{ presentation: "card" }} />
          <Stack.Screen name="(screens)/chat/ChatArchive" options={{ presentation: "card" }} />
          {/* 프로젝트 */}
          <Stack.Screen name="(screens)/project/[projectId]" options={{ presentation: "card" }} />
          {/* 투두 */}
          <Stack.Screen name="(screens)/todo/add"           options={{ presentation: "card" }} />
          <Stack.Screen name="(screens)/todo/[projectId]"   options={{ presentation: "card" }} />
          {/* 회의 */}
          <Stack.Screen name="(screens)/meeting/index"     options={{ presentation: "fullScreenModal", gestureEnabled: true, gestureDirection: "vertical" }} />
          <Stack.Screen name="(screens)/meeting/recording" options={{ presentation: "fullScreenModal", gestureEnabled: true, gestureDirection: "vertical" }} />
          <Stack.Screen name="(screens)/meeting/finalize"  options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
          {/* QR */}
          <Stack.Screen name="(screens)/qr/scan" options={{ presentation: "fullScreenModal", gestureEnabled: true, gestureDirection: "vertical" }} />
          {/* 리포트 */}
          <Stack.Screen name="(screens)/report/[projectId]" options={{ presentation: "card" }} />
          {/* 일정 조율 (When2Meet) */}
          <Stack.Screen name="(screens)/when2meet/[projectId]" options={{ presentation: "card" }} />
          <Stack.Screen name="(screens)/when2meet/poll/[pollId]" options={{ presentation: "card" }} />
          {/* 설정 / 친구 / 드라이브 / 프로필수정 / 아이디비번변경 */}
          <Stack.Screen name="(screens)/settings"            options={{ presentation: "card" }} />
          <Stack.Screen name="(screens)/friends/index"       options={{ presentation: "card" }} />
          <Stack.Screen name="(screens)/drive/index"           options={{ presentation: "card" }} />
          <Stack.Screen name="(screens)/drive/[folderId]"    options={{ presentation: "card" }} />
          <Stack.Screen name="(screens)/profile-edit"        options={{ presentation: "card" }} />
          <Stack.Screen name="(screens)/change-credentials"  options={{ presentation: "card" }} />
          <Stack.Screen name="(screens)/AddChat"             options={{ presentation: "card" }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ProjectProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}