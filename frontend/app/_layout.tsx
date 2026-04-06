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

  useEffect(() => {
    // 폰트 로딩 등 초기화 작업 후 스플래시 숨기기
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
      <ProjectProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false }}>
          {/* 앱 진입점 */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          {/* 온보딩 화면들 */}
          <Stack.Screen name="(onboarding)/Splashscreen" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)/signin" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)/signup" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)/usersetup" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)/welcome" options={{ headerShown: false, gestureEnabled: false }} />
          {/* 탭바 화면들 */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* 탭 밖 세부 화면들 */}
          <Stack.Screen
            name="(screens)/chat/[projectId]"
            options={{
              headerShown: false,
              presentation: "card",  // 슬라이드 인
            }}
          />
          <Stack.Screen
            name="(screens)/chat/ChatMenu"
            options={{
              headerShown: false,
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="(screens)/chat/ChatArchive"
            options={{
              headerShown: false,
              presentation: "card",
            }}
          />
          <Stack.Screen
            name="(screens)/meeting/index"
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
            }}
          />
          <Stack.Screen
            name="(screens)/meeting/recording"
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
            }}
          />
          <Stack.Screen
            name="(screens)/qr/scan"
            options={{
              headerShown: false,
              presentation: "fullScreenModal",
            }}
          />
          <Stack.Screen
            name="(screens)/report/[projectId]"
            options={{
              headerShown: false,
              presentation: "card",
            }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ProjectProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}