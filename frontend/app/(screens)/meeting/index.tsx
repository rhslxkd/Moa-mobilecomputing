/**
 * app/(screens)/meeting/index.tsx
 *
 * 회의 화면 — 새 회의 시작 + 지난 회의 목록
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { useProject } from "@/contexts/ProjectContext";
import OptionSheet, { MEETING_OPTIONS } from "@/components/modals/OptionSheet";
import Icon from "@/components/common/Icon";
import { MeetingAPI, MeetingDTO } from "@/services/api";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}시간 ${m > 0 ? m + "분" : ""}`.trim();
  if (m > 0) return `${m}분`;
  return `${seconds}초`;
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

interface MeetingHistoryItemProps {
  meeting: MeetingDTO;
  onOption: () => void;
}

function MeetingHistoryItem({ meeting, onOption }: MeetingHistoryItemProps) {
  const C = useTheme();
  const router = useRouter();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[styles.historyItem, { backgroundColor: C.bgCard, borderColor: C.border }]}
    >
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.historyTitle, { color: C.text }]}>{meeting.title}</Text>
            <Text style={[styles.historyDate, { color: C.primary }]}>
              {formatDate(meeting.created_at)}  {formatDuration(meeting.duration_seconds)}
            </Text>
          </View>
          <TouchableOpacity onPress={onOption} activeOpacity={0.7} style={styles.historyOption}>
            <Icon name="option" size={20} color={C.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={[styles.summaryBox, { borderColor: C.primary + "40", backgroundColor: C.primary + "08" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Icon name="file" size={14} color={C.primary} />
            <Text style={[styles.summaryTitle, { color: C.primary }]}>
              AI 요약 · 참여자 {meeting.participants.length}명
            </Text>
          </View>
          {meeting.summary.length > 0 ? (
            meeting.summary.map((line, i) => (
              <Text key={i} style={[styles.summaryLine, { color: C.textSub }]}>{line}</Text>
            ))
          ) : (
            <Text style={[styles.summaryLine, { color: C.textMuted }]}>요약이 없습니다.</Text>
          )}
          <TouchableOpacity
            style={styles.detailBtn}
            activeOpacity={0.7}
            onPress={() => router.push(`/(screens)/meeting/${meeting.id}` as any)}
          >
            <Text style={[styles.detailText, { color: C.textMuted }]}>자세히 보기  &gt;</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MeetingScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentProject } = useProject();
  const [meetings, setMeetings] = useState<MeetingDTO[]>([]);
  const [optionOpen, setOptionOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      MeetingAPI.list(currentProject?.id)
        .then(setMeetings)
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }, [currentProject?.id])
  );

  const handleDelete = async () => {
    if (!selectedId) return;
    setMeetings(prev => prev.filter(m => m.id !== selectedId));
    await MeetingAPI.delete(selectedId).catch(() => {});
    setSelectedId(null);
    setOptionOpen(false);
  };

  const selectedMeeting = meetings.find(m => m.id === selectedId) ?? null;

  const handleView = () => {
    if (!selectedId) return;
    setOptionOpen(false);
    router.push(`/(screens)/meeting/${selectedId}` as any);
  };

  const handleShare = async () => {
    if (!selectedMeeting) return;
    const lines = selectedMeeting.summary.length > 0
      ? selectedMeeting.summary.map(l => `• ${l}`).join("\n")
      : (selectedMeeting.transcript ?? "요약이 없습니다.");
    try {
      await Share.share({
        title: selectedMeeting.title,
        message: `[${selectedMeeting.title}]\n${formatDate(selectedMeeting.created_at)}\n\n${lines}`,
      });
    } catch {}
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]} edges={["bottom"]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.7}>
          <Icon name="back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>회의 · </Text>
          <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>
            {currentProject?.name ?? "회의"}
          </Text>
        </View>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── 새 회의 시작 카드 ── */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/(screens)/meeting/recording" as any)}
        >
          <LinearGradient
            colors={["#00A9EC", "#0084FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.newMeetingCard}
          >
            <View style={styles.micCircle}>
              <Icon name="mic" size={40} color="rgba(255,255,255,0.9)" />
            </View>
            <Text style={styles.newMeetingTitle}>새 회의 시작</Text>
            <Text style={styles.newMeetingDesc}>폰을 테이블에 올려두면 자동으로 발언을 기록해요</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── QR 출석 버튼 ── */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/(screens)/qr/scan" as any)}
          style={[styles.attendBtn, { borderColor: C.primary, backgroundColor: C.primary + "10" }]}
        >
          <Icon name="camera" size={20} color={C.primary} />
          <Text style={[styles.attendText, { color: C.primary }]}>QR 스캔하고 회의 출석하기</Text>
        </TouchableOpacity>

        {/* ── 지난 회의 ── */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>지난 회의</Text>

        {isLoading ? (
          <ActivityIndicator size="small" color="#00A9EC" style={{ paddingVertical: 24 }} />
        ) : meetings.length === 0 ? (
          <Text style={[styles.emptyText, { color: C.textMuted }]}>아직 회의가 없어요.</Text>
        ) : (
          meetings.map(m => (
            <MeetingHistoryItem
              key={m.id}
              meeting={m}
              onOption={() => { setSelectedId(m.id); setOptionOpen(true); }}
            />
          ))
        )}

      </ScrollView>

      {/* 회의 옵션 바텀시트 */}
      <OptionSheet
        isOpen={optionOpen}
        onClose={() => { setOptionOpen(false); setSelectedId(null); }}
        title="회의 옵션"
        options={MEETING_OPTIONS(
          handleView,
          handleDelete,
          handleShare,
        )}
      />
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
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  headerSub: { fontSize: 15, fontWeight: "400" },
  headerTitle: { fontSize: 15, fontWeight: "600", flex: 1 },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  historyDate: { fontSize: 12, marginTop: 2 },
  summaryBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 3,
  },
  summaryTitle: { fontSize: 13, fontWeight: "600" },
  summaryLine: { fontSize: 13, lineHeight: 20 },
  detailBtn: { alignSelf: "flex-end", marginTop: 4 },
  detailText: { fontSize: 12 },

  body: { padding: 16, gap: 16, paddingBottom: 40 },

  newMeetingCard: {
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 10,
  },
  micCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  newMeetingTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },
  newMeetingDesc: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },

  sectionTitle: { fontSize: 16, fontWeight: "600" },
  attendBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5 },
  attendText: { fontSize: 14, fontWeight: "700" },
  historyItem: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  historyTitle: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  historyOption: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  emptyText: { textAlign: "center", fontSize: 14, paddingVertical: 24 },
});
