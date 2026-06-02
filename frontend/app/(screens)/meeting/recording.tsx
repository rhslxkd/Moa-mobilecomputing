/**
 * app/(screens)/meeting/recording.tsx
 *
 * 피그마 Meeting/Recording 화면 기반
 *
 * 레이아웃:
 *   - 상단 네비: 뒤로가기 + 회의 제목
 *   - 중앙: 녹음 애니메이션 (파형 + 마이크)
 *   - 참여자 목록: 발언 시간 표시
 *   - 하단: 녹음 종료 버튼
 *
 * 라우팅: meeting/index → meeting/recording
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { useProject } from "@/contexts/ProjectContext";
import { MeetingAPI } from "@/services/api";

// ── 파형 막대 애니메이션 ────────────────────
function WaveBar({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 400 + Math.random() * 200,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 400 + Math.random() * 200,
          useNativeDriver: true,
        }),
      ])
    );
    const timeout = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timeout);
      loop.stop();
    };
  }, []);

  return (
    <Animated.View
      style={[
        styles.waveBar,
        { transform: [{ scaleY: anim }] },
      ]}
    />
  );
}

// ── 참여자 아이템 ───────────────────────────
interface ParticipantProps {
  name: string;
  initial: string;
  speakTime: string;
  isSpeaking: boolean;
  color: string;
}

function ParticipantItem({ name, initial, speakTime, isSpeaking, color }: ParticipantProps) {
  const C = useTheme();
  return (
    <View style={[styles.participantItem, { backgroundColor: C.bgCard, borderColor: C.border }]}>
      <View style={[styles.participantAvatar, { backgroundColor: color }]}>
        <Text style={styles.participantInitial}>{initial}</Text>
        {isSpeaking && <View style={styles.speakingDot} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.participantName, { color: C.text }]}>{name}</Text>
        <Text style={[styles.participantSpeakTime, { color: C.textMuted }]}>
          발언 {speakTime}
        </Text>
      </View>
      {isSpeaking && (
        <View style={styles.speakingBadge}>
          <Text style={styles.speakingBadgeText}>발언 중</Text>
        </View>
      )}
    </View>
  );
}

const PARTICIPANTS = [
  { name: "박지민", initial: "박", speakTime: "3분 12초", isSpeaking: true,  color: "#2563EB" },
  { name: "김민준", initial: "김", speakTime: "1분 45초", isSpeaking: false, color: "#7C3AED" },
  { name: "이서연", initial: "이", speakTime: "2분 08초", isSpeaking: false, color: "#0D9488" },
  { name: "최준혁", initial: "최", speakTime: "0분 52초", isSpeaking: false, color: "#D97706" },
];

export default function MeetingRecordingScreen() {
  const C = useTheme();
  const router = useRouter();
  const { currentProject } = useProject();

  // 녹음 타이머
  const [seconds, setSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(true);

  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleStop = () => {
    Alert.alert(
      "회의 종료",
      "회의를 종료하고 회의록을 생성할까요?",
      [
        { text: "계속 진행", style: "cancel" },
        {
          text: "종료하기",
          style: "destructive",
          onPress: async () => {
            setIsRecording(false);
            const title = new Date().toLocaleDateString("ko-KR", {
              year: "numeric", month: "long", day: "numeric",
            }) + " 회의";
            await MeetingAPI.create({
              title,
              project_id: currentProject?.id,
              duration_seconds: seconds,
              participants: PARTICIPANTS.map(p => ({ name: p.name, speak_time_seconds: 0 })),
            }).catch(() => {});
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Text style={[styles.backArrow, { color: C.text }]}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: C.text }]}>회의록 기록 중</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>AI 챗봇 개발 프로젝트</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* ── 녹음 상태 카드 ── */}
        <LinearGradient
          colors={["#00A9EC", "#0062FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.recordingCard}
        >
          {/* 파형 */}
          <View style={styles.waveContainer}>
            {Array.from({ length: 20 }).map((_, i) => (
              <WaveBar key={i} delay={i * 80} />
            ))}
          </View>

          {/* 타이머 */}
          <Text style={styles.timerText}>{formatTime(seconds)}</Text>
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingLabel}>녹음 중</Text>
          </View>
        </LinearGradient>

        {/* ── 참여자 목록 ── */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>참여자 발언 기록</Text>

        {PARTICIPANTS.map((p) => (
          <ParticipantItem key={p.name} {...p} />
        ))}

        {/* ── AI 메모 (실시간 인식) ── */}
        <View style={[styles.memoCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <Text style={[styles.memoTitle, { color: C.text }]}>🤖 실시간 AI 요약</Text>
          <Text style={[styles.memoText, { color: C.textSub }]}>
            "이번 스프린트의 목표는 사용자 인증 모듈을 완성하는 것입니다. 
            로그인 화면 UI는 박지민이 담당하고, 백엔드 API는 김민준이 담당하기로..."
          </Text>
        </View>
      </ScrollView>

      {/* 하단 종료 버튼 */}
      <View style={[styles.footer, { backgroundColor: C.bg }]}>
        <TouchableOpacity
          onPress={handleStop}
          activeOpacity={0.85}
          style={styles.stopBtn}
        >
          <View style={styles.stopIcon} />
          <Text style={styles.stopBtnText}>회의 종료</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backArrow: { fontSize: 32, fontWeight: "300", lineHeight: 36 },
  headerTitle: { fontSize: 15, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 2 },

  body: { padding: 16, gap: 16, paddingBottom: 100 },

  // 녹음 카드
  recordingCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 16,
  },
  waveContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    gap: 3,
  },
  waveBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  timerText: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF3B30",
  },
  recordingLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "600",
  },

  // 섹션
  sectionTitle: { fontSize: 16, fontWeight: "600" },

  // 참여자
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  participantInitial: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  speakingDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  participantName: { fontSize: 15, fontWeight: "600" },
  participantSpeakTime: { fontSize: 13, marginTop: 2 },
  speakingBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  speakingBadgeText: { color: "#16A34A", fontSize: 12, fontWeight: "600" },

  // AI 메모 카드
  memoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  memoTitle: { fontSize: 14, fontWeight: "700" },
  memoText: { fontSize: 13, lineHeight: 20 },

  // 하단
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  stopBtn: {
    backgroundColor: "#EF4444",
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  stopIcon: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  stopBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
