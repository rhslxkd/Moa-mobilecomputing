/**
 * app/(screens)/meeting/index.tsx
 * 
 * 회의 화면 — 새 회의 시작 + 지난 회의 목록
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { useProject } from "@/contexts/ProjectContext";
import OptionSheet, { MEETING_OPTIONS } from "@/components/modals/OptionSheet";
import Icon from "@/components/common/Icon";

// 회의 기록 아이템
interface MeetingHistoryItemProps {
  index: number;
  onOption: () => void;
}

function MeetingHistoryItem({ index, onOption }: MeetingHistoryItemProps) {
  const C = useTheme();
  const MEETINGS = [
    { title: "스프린트 1 리뷰", date: "2026.03.28", duration: "1시간 12분", members: 4 },
    { title: "백엔드 API 설계 논의", date: "2026.03.24", duration: "45분", members: 3 },
    { title: "킥오프 미팅", date: "2026.03.18", duration: "2시간 05분", members: 5 },
  ];
  const m = MEETINGS[index % MEETINGS.length];

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[styles.historyItem, { backgroundColor: C.bgCard, borderColor: C.border }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.historyTitle, { color: C.text }]}>{m.title}</Text>
        <Text style={[styles.historyMeta, { color: C.textMuted }]}>
          {m.date} · {m.duration} · 참여 {m.members}명
        </Text>
      </View>
      <TouchableOpacity onPress={onOption} activeOpacity={0.7} style={styles.historyOption}>
        <Icon name="option" size={20} color={C.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function MeetingScreen() {
  const C = useTheme();
  const router = useRouter();
  const { currentProject } = useProject();
  const [optionOpen, setOptionOpen] = useState(false);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>회의 ·</Text>
          <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>
            {currentProject.name}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          activeOpacity={0.7}
          onPress={() => setOptionOpen(true)}
        >
          <Icon name="option" size={22} color={C.textSub} />
        </TouchableOpacity>
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

        {/* ── 지난 회의 ── */}
        <Text style={[styles.sectionTitle, { color: C.text }]}>지난 회의</Text>

        {[0, 1, 2].map((i) => (
          <MeetingHistoryItem
            key={i}
            index={i}
            onOption={() => setOptionOpen(true)}
          />
        ))}

      </ScrollView>

      {/* 회의 옵션 바텀시트 */}
      <OptionSheet
        isOpen={optionOpen}
        onClose={() => setOptionOpen(false)}
        title="회의 옵션"
        options={MEETING_OPTIONS(
          () => Alert.alert("회의록", "회의록을 엽니다."),
          () => Alert.alert("삭제", "회의가 삭제되었습니다.")
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  headerSub: { fontSize: 15, fontWeight: "400" },
  headerTitle: { fontSize: 15, fontWeight: "600", flex: 1 },
  iconBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },

  body: { padding: 16, gap: 16, paddingBottom: 40 },

  // 새 회의 카드
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
  newMeetingTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  newMeetingDesc: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },

  // 지난 회의
  sectionTitle: { fontSize: 16, fontWeight: "600" },
  historyItem: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyTitle: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  historyMeta: { fontSize: 12 },
  historyOption: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
});
