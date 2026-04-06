import { Redirect } from "expo-router";

// 앱 진입점 — 스플래시 화면으로 리다이렉트
export default function Index() {
  return <Redirect href="/(onboarding)/Splashscreen" />;
}
