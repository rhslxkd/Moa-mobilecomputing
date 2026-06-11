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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from "expo-audio";
import { ActivityIndicator } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useTheme } from "@/hooks/useTheme";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { MeetingAPI, MeetingAttendanceDTO } from "@/services/api";

// 멤버 아바타 색상 팔레트
const AVATAR_COLORS = ["#2563EB", "#7C3AED", "#0D9488", "#D97706", "#DC2626", "#0891B2"];

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

export default function MeetingRecordingScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentProject } = useProject();

  const { user } = useAuth();

  // 오디오 레코더
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // 녹음 타이머 / 상태
  const [seconds, setSeconds] = useState(0);
  const [isRecording, setIsRecording] = useState(true);
  const [processing, setProcessing] = useState(false);

  // QR 출석
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<MeetingAttendanceDTO[]>([]);

  // 마운트 시: 회의 생성(시작) → 권한 → 녹음 시작
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const title = new Date().toLocaleDateString("ko-KR", {
          year: "numeric", month: "long", day: "numeric",
        }) + " 회의";
        const meeting = await MeetingAPI.start({ title, project_id: currentProject?.id });
        if (cancelled) return;
        setMeetingId(meeting.id);
        setAttendees(meeting.attendance ?? []);
      } catch {
        Alert.alert("회의 시작 실패", "회의를 시작할 수 없습니다. 네트워크를 확인해주세요.");
      }
      try {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) {
          Alert.alert("마이크 권한 필요", "회의 녹음을 위해 마이크 권한을 허용해주세요.");
          return;
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
      } catch (e) {
        Alert.alert("녹음 오류", "녹음을 시작할 수 없습니다.");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 출석 현황 폴링 (4초)
  useEffect(() => {
    if (!meetingId || !isRecording) return;
    const t = setInterval(() => {
      MeetingAPI.attendance(meetingId)
        .then((r) => setAttendees(r.attendees))
        .catch(() => {});
    }, 4000);
    return () => clearInterval(t);
  }, [meetingId, isRecording]);

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
      "회의를 종료할까요? 출석/사유를 확인한 뒤 회의록이 생성됩니다.",
      [
        { text: "계속 진행", style: "cancel" },
        {
          text: "종료하기",
          style: "destructive",
          onPress: async () => {
            setIsRecording(false);
            let audioUri: string | null = null;
            try {
              await audioRecorder.stop();
              audioUri = audioRecorder.uri;
            } catch {}

            if (!meetingId) {
              Alert.alert("오류", "회의 정보가 없어 저장할 수 없습니다.");
              router.back();
              return;
            }
            // 사유 입력 + 마무리 화면으로 이동
            router.replace({
              pathname: "/(screens)/meeting/finalize",
              params: {
                meetingId,
                duration: String(seconds),
                audioUri: audioUri ?? "",
              },
            } as any);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={["bottom"]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Text style={[styles.backArrow, { color: C.text }]}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: C.text }]}>회의록 기록 중</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]} numberOfLines={1}>
            {currentProject?.name ?? "회의"}
          </Text>
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

        {/* ── QR 출석 ── */}
        <View style={[styles.qrCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text, marginBottom: 4 }]}>📷 QR 출석</Text>
          <Text style={[styles.memoText, { color: C.textMuted, textAlign: "center" }]}>
            팀원이 이 QR을 스캔하면 출석 처리돼요. (지각 시간도 자동 기록)
          </Text>
          <View style={styles.qrBox}>
            {meetingId ? (
              <QRCode value={`moa-meeting:${meetingId}`} size={180} />
            ) : (
              <ActivityIndicator color={C.primary} />
            )}
          </View>
        </View>

        {/* ── 출석 현황 ── */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>출석 ({attendees.length}명)</Text>
        {attendees.length > 0 ? (
          attendees.map((p, i) => {
            const late = (p.late_seconds ?? 0) >= 120;
            return (
              <ParticipantItem
                key={p.user_id ?? `att-${i}`}
                name={p.name}
                initial={p.name.charAt(0)}
                speakTime={late ? `지각 ${Math.round((p.late_seconds ?? 0) / 60)}분` : "정시 출석"}
                isSpeaking={false}
                color={AVATAR_COLORS[i % AVATAR_COLORS.length]}
              />
            );
          })
        ) : (
          <Text style={[styles.memoText, { color: C.textMuted, paddingHorizontal: 4 }]}>
            아직 출석한 팀원이 없어요. QR을 보여주세요.
          </Text>
        )}

        {/* ── 화자 자동매칭 안내 ── */}
        <View style={[styles.memoCard, { backgroundColor: C.primary + "10", borderColor: C.primary + "30" }]}>
          <Text style={[styles.memoTitle, { color: C.primary }]}>🎤 발언할 때 이름을 말해주세요</Text>
          <Text style={[styles.memoText, { color: C.textSub }]}>
            발언 시작 시 본인 이름을 말하면(예: "현수인데요, ~") AI가 화자를 자동으로 멤버와 매칭해요. 회의록에서 수정도 가능합니다.
          </Text>
        </View>

        {/* ── AI 요약 안내 ── */}
        <View style={[styles.memoCard, { backgroundColor: C.bgCard, borderColor: C.border }]}>
          <Text style={[styles.memoTitle, { color: C.text }]}>🤖 AI 회의록</Text>
          <Text style={[styles.memoText, { color: C.textSub }]}>
            회의가 끝나면 녹음된 음성을 자동으로 텍스트로 변환하고 핵심 내용을 요약해드려요.
          </Text>
        </View>
      </ScrollView>

      {/* 하단 종료 버튼 */}
      <View style={[styles.footer, { backgroundColor: C.bg }]}>
        <TouchableOpacity
          onPress={handleStop}
          activeOpacity={0.85}
          style={styles.stopBtn}
          disabled={processing}
        >
          <View style={styles.stopIcon} />
          <Text style={styles.stopBtnText}>회의 종료</Text>
        </TouchableOpacity>
      </View>

      {/* 처리 중 오버레이 */}
      {processing && (
        <View style={styles.processingOverlay}>
          <View style={[styles.processingBox, { backgroundColor: C.bgCard }]}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={[styles.processingText, { color: C.text }]}>
              AI가 회의록을 정리하고 있어요…
            </Text>
            <Text style={[styles.processingSub, { color: C.textMuted }]}>
              음성을 텍스트로 변환하고 요약하는 중입니다.
            </Text>
          </View>
        </View>
      )}
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

  // QR 카드
  qrCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8, alignItems: "center" },
  qrBox: { backgroundColor: "#fff", padding: 14, borderRadius: 12, marginTop: 6 },

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

  // 처리 중 오버레이
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  processingBox: {
    width: "100%",
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 12,
  },
  processingText: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  processingSub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
});
