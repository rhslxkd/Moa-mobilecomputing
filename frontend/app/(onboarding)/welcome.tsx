/**
 * app/(onboarding)/welcome.tsx
 *
 * 피그마 WelcomeScreen (node: 2041:709) 기반 — 원본 SVG 그대로 재현
 * 디자인 기준 화면: 390 × 844 (iPhone 14)
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { SvgXml } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import MoaLogo from "@/components/common/MoaLogo";

const { width, height } = Dimensions.get("window");

// 피그마 기준 스케일 (390 × 844)
const sx = width / 390;
const sy = height / 844;

// ── 피그마 원본 SVG (Ellipse209, 210, 211) ─────────────────────
// 그래디언트 방향·색상·좌표 모두 피그마 에셋과 동일

const BLOB_LARGE = `<svg viewBox="0 0 459 459" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="229.5" cy="229.5" r="229.5" fill="url(#p1)"/>
<defs>
<linearGradient id="p1" x1="-285" y1="115.75" x2="459" y2="344.25" gradientUnits="userSpaceOnUse">
<stop offset="0.548443" stop-color="#00A9EC" stop-opacity="0"/>
<stop offset="1" stop-color="#0084FF"/>
</linearGradient>
</defs>
</svg>`;

const BLOB_MEDIUM = `<svg viewBox="0 0 225.323 225.323" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="112.662" cy="112.662" r="112.662" fill="url(#p2)"/>
<defs>
<linearGradient id="p2" x1="-139.907" y1="56.8217" x2="225.323" y2="168.992" gradientUnits="userSpaceOnUse">
<stop offset="0.433233" stop-color="#E5E7EB" stop-opacity="0"/>
<stop offset="1" stop-color="#00A9EC"/>
</linearGradient>
</defs>
</svg>`;

const BLOB_SMALL = `<svg viewBox="0 0 118.392 118.392" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="59.1961" cy="59.1961" r="59.1961" fill="url(#p3)"/>
<defs>
<linearGradient id="p3" x1="-73.5115" y1="29.856" x2="118.392" y2="88.7941" gradientUnits="userSpaceOnUse">
<stop offset="0.485479" stop-color="#E5E7EB" stop-opacity="0"/>
<stop offset="1" stop-color="#00A9EC"/>
</linearGradient>
</defs>
</svg>`;

// ── 배경 블롭 ────────────────────────────────────────────────────
//
// 피그마 구조: 외부 컨테이너(flex center) → 내부(rotate) → 원 이미지
//   Ellipse209: 컨테이너 594×594 @(left=-0.36, top=83.64), 내부 459×459, rotate=-21.22deg
//   Ellipse210: 컨테이너 317.866 @(left=-101, top=279),    내부 225.323×225.323, rotate=139.03deg
//   Ellipse211: 컨테이너 165.093 @(left=74, top=421),      내부 118.392×118.392, rotate=-54.59deg
//
// 내부 원 중심(스크린 좌표) = left + (컨테이너-내부)/2 + 내부반지름
//   대형: cx≈296.64,  cy≈380.64
//   중형: cx≈57.93,   cy≈437.93
//   소형: cx≈156.55,  cy≈503.55

function BackgroundBlobs() {
  // 대형 (Ellipse209)
  const lW = 459 * sx;
  const lH = 459 * sy;
  const lL = (296.64 - 229.5) * sx;
  const lT = (380.64 - 229.5) * sy;

  // 중형 (Ellipse210)
  const mW = 225.323 * sx;
  const mH = 225.323 * sy;
  const mL = (57.93 - 112.662) * sx;
  const mT = (437.93 - 112.662) * sy;

  // 소형 (Ellipse211)
  const sW = 118.392 * sx;
  const sH = 118.392 * sy;
  const sL = (156.55 - 59.196) * sx;
  const sT = (503.55 - 59.196) * sy;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Ellipse209 — 대형, rotate -21.22deg */}
      <View
        style={{
          position: "absolute",
          left: lL,
          top: lT,
          width: lW,
          height: lH,
          transform: [{ rotate: "-21.22deg" }],
        }}
      >
        <SvgXml xml={BLOB_LARGE} width={lW} height={lH} />
      </View>

      {/* Ellipse210 — 중형, rotate 139.03deg */}
      <View
        style={{
          position: "absolute",
          left: mL,
          top: mT,
          width: mW,
          height: mH,
          transform: [{ rotate: "139.03deg" }],
        }}
      >
        <SvgXml xml={BLOB_MEDIUM} width={mW} height={mH} />
      </View>

      {/* Ellipse211 — 소형, rotate -54.59deg */}
      <View
        style={{
          position: "absolute",
          left: sL,
          top: sT,
          width: sW,
          height: sH,
          transform: [{ rotate: "-54.59deg" }],
        }}
      >
        <SvgXml xml={BLOB_SMALL} width={sW} height={sH} />
      </View>
    </View>
  );
}

// ── 메인 화면 ────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <BackgroundBlobs />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* 로고 — 피그마: left=23, top=50 */}
        <View style={styles.logoWrap}>
          <MoaLogo size={48} variant="primary" />
        </View>

        {/* 텍스트 블록 — 피그마: top=262, left=30 */}
        <View style={styles.textBlock}>
          <Text style={styles.greeting}>
            환영해요! <Text style={styles.greetingBold}>손범관</Text>님.
          </Text>
          <Text style={styles.greeting}>{" "}</Text>
          <Text style={styles.subtitle}>프로젝트 도구부터 기여도 측정까지,</Text>
          <Text style={styles.mainTitle}>
            모두 <Text style={styles.mainTitleBlue}>MOA</Text> 드릴게요.
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        {/* 버튼 — 피그마: bottom=106, height=44, radius=16 */}
        <View style={styles.btnWrap}>
          <LinearGradient
            colors={["#00A9EC", "#0084FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)" as any)}
              activeOpacity={0.85}
              style={styles.btnInner}
            >
              <Text style={styles.btnText}>프로젝트 시작하기</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F1F1F5",
    overflow: "hidden",
  },
  safe: {
    flex: 1,
  },
  logoWrap: {
    paddingLeft: 23,
    paddingTop: 4,
  },
  textBlock: {
    paddingHorizontal: 30,
    marginTop: height * 0.2,
  },
  greeting: {
    fontSize: 16,
    fontWeight: "400",
    color: "#111111",
    lineHeight: 16 * 1.4,
  },
  greetingBold: {
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
    lineHeight: 16 * 1.4,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111111",
    lineHeight: 32 * 1.4,
  },
  mainTitleBlue: {
    color: "#00A9EC",
  },
  btnWrap: {
    paddingHorizontal: 20,
    paddingBottom: height * (106 / 844),
  },
  btnGradient: {
    borderRadius: 16,
    height: 44,
  },
  btnInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "400",
  },
});
