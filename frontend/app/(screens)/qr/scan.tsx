/**
 * app/(screens)/qr/scan.tsx
 *
 * QR 코드 스캔 화면
 *
 * 레이아웃:
 *   - 어두운 배경 + 카메라 뷰파인더
 *   - 중앙: QR 스캔 박스 (코너 가이드)
 *   - 하단: 설명 텍스트 + 닫기 버튼
 *
 * 등록 위치: app/_layout.tsx (screens)/qr/scan
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");
const QR_BOX_SIZE = width * 0.65;

// ── QR 박스 코너 가이드 ─────────────────────
function Corner({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const isTop = position.startsWith("t");
  const isLeft = position.endsWith("l");

  return (
    <View
      style={[
        styles.corner,
        isTop ? { top: 0 } : { bottom: 0 },
        isLeft ? { left: 0 } : { right: 0 },
        {
          borderTopWidth: isTop ? 3 : 0,
          borderBottomWidth: isTop ? 0 : 3,
          borderLeftWidth: isLeft ? 3 : 0,
          borderRightWidth: isLeft ? 0 : 3,
          borderTopLeftRadius: position === "tl" ? 6 : 0,
          borderTopRightRadius: position === "tr" ? 6 : 0,
          borderBottomLeftRadius: position === "bl" ? 6 : 0,
          borderBottomRightRadius: position === "br" ? 6 : 0,
        },
      ]}
    />
  );
}

export default function QRScanScreen() {
  const router = useRouter();
  const [scanned, setScanned] = useState(false);

  const handleClose = () => router.back();

  const handleSimulateScan = () => {
    // TODO: 실제 QR 스캔 (expo-camera 또는 expo-barcode-scanner 연결)
    setScanned(true);
    setTimeout(() => {
      setScanned(false);
      router.back();
    }, 1200);
  };

  return (
    <View style={styles.container}>
      {/* 어두운 배경 */}
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safe}>
        {/* 상단 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={styles.closeBtn}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QR 코드 스캔</Text>
          <View style={styles.closeBtn} />
        </View>

        {/* 뷰파인더 영역 */}
        <View style={styles.viewfinderContainer}>
          {/* 위쪽 어두운 영역 */}
          <View style={styles.dimArea} />

          {/* 스캔 박스 행 */}
          <View style={{ flexDirection: "row" }}>
            <View style={[styles.dimArea, { width: (width - QR_BOX_SIZE) / 2, height: QR_BOX_SIZE }]} />

            {/* QR 박스 */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleSimulateScan}
              style={[
                styles.qrBox,
                { borderColor: scanned ? "#22C55E" : "rgba(255,255,255,0.15)" },
              ]}
            >
              <Corner position="tl" />
              <Corner position="tr" />
              <Corner position="bl" />
              <Corner position="br" />

              {scanned && (
                <View style={styles.scannedOverlay}>
                  <Text style={styles.scannedCheck}>✓</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={[styles.dimArea, { width: (width - QR_BOX_SIZE) / 2, height: QR_BOX_SIZE }]} />
          </View>

          {/* 아래쪽 어두운 영역 */}
          <View style={styles.dimArea} />
        </View>

        {/* 안내 텍스트 */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>QR 코드를 스캔하세요</Text>
          <Text style={styles.infoDesc}>
            팀원의 QR 코드를 위 박스 안에{"\n"}맞추면 자동으로 인식됩니다.
          </Text>

          {/* 닫기 버튼 */}
          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.8}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelBtnText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  safe: { flex: 1 },

  // 헤더
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "300",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // 뷰파인더
  viewfinderContainer: { flex: 1 },
  dimArea: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  // QR 박스
  qrBox: {
    width: QR_BOX_SIZE,
    height: QR_BOX_SIZE,
    borderWidth: 1,
    borderRadius: 8,
    position: "relative",
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#00A9EC",
  },
  scannedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(34,197,94,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  scannedCheck: {
    color: "#FFFFFF",
    fontSize: 60,
    fontWeight: "700",
  },

  // 하단 안내
  infoContainer: {
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === "ios" ? 48 : 40,
    paddingTop: 32,
    alignItems: "center",
    gap: 12,
  },
  infoTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  infoDesc: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  cancelBtn: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 100,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  cancelBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
