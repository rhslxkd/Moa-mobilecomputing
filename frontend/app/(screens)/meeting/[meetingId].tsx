/**
 * app/(screens)/meeting/[meetingId].tsx
 * 회의 상세 — AI 요약 + 회의록 전문(transcript) + 참여자
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import Icon from "@/components/common/Icon";
import { MeetingAPI, MeetingDTO } from "@/services/api";

const AVATAR_COLORS = ["#2563EB", "#7C3AED", "#0D9488", "#D97706", "#DC2626", "#0891B2"];

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분 ${s}초`;
  return `${s}초`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

export default function MeetingDetailScreen() {
  const C = useTheme();
  const router = useRouter();
  const { meetingId } = useLocalSearchParams<{ meetingId: string }>();

  const [meeting, setMeeting] = useState<MeetingDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!meetingId) return;
      setLoading(true);
      MeetingAPI.get(meetingId)
        .then(setMeeting)
        .catch(() => setMeeting(null))
        .finally(() => setLoading(false));
    }, [meetingId])
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      {/* 헤더 */}
      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.7}>
          <Icon name="back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.text }]}>회의록</Text>
        <View style={s.iconBtn} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : !meeting ? (
        <View style={s.center}>
          <Text style={{ color: C.textMuted }}>회의를 찾을 수 없어요.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {/* 회의 정보 */}
          <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <Text style={[s.title, { color: C.text }]}>{meeting.title}</Text>
            <Text style={[s.metaText, { color: C.textMuted }]}>
              {formatDate(meeting.created_at)} · {formatDuration(meeting.duration_seconds)} · 참여자 {meeting.participants.length}명
            </Text>
          </View>

          {/* 참여자 */}
          {meeting.participants.length > 0 && (
            <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <Text style={[s.sectionTitle, { color: C.text }]}>참여자</Text>
              <View style={s.participantRow}>
                {meeting.participants.map((p, i) => (
                  <View key={p.id} style={s.participant}>
                    <View style={[s.avatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
                      <Text style={s.avatarText}>{p.name.charAt(0)}</Text>
                    </View>
                    <Text style={[s.participantName, { color: C.text }]}>{p.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* AI 요약 */}
          <View style={[s.card, { backgroundColor: C.primary + "08", borderColor: C.primary + "30" }]}>
            <View style={s.sectionHeader}>
              <Icon name="file" size={16} color={C.primary} />
              <Text style={[s.sectionTitle, { color: C.primary }]}>🤖 AI 요약</Text>
            </View>
            {meeting.summary.length > 0 ? (
              meeting.summary.map((line, i) => (
                <View key={i} style={s.summaryItem}>
                  <Text style={[s.bullet, { color: C.primary }]}>•</Text>
                  <Text style={[s.summaryText, { color: C.textSub }]}>{line}</Text>
                </View>
              ))
            ) : (
              <Text style={[s.emptyText, { color: C.textMuted }]}>
                요약된 내용이 없어요. (녹음이 너무 짧았을 수 있어요)
              </Text>
            )}
          </View>

          {/* 회의록 전문 */}
          <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
            <Text style={[s.sectionTitle, { color: C.text }]}>회의록 전문</Text>
            {meeting.transcript ? (
              <Text style={[s.transcriptText, { color: C.textSub }]}>{meeting.transcript}</Text>
            ) : (
              <Text style={[s.emptyText, { color: C.textMuted }]}>녹취록이 없어요.</Text>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", textAlign: "center" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { padding: 16, gap: 14, paddingBottom: 40 },

  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  title: { fontSize: 18, fontWeight: "700" },
  metaText: { fontSize: 13 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },

  participantRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 4 },
  participant: { alignItems: "center", gap: 6 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  participantName: { fontSize: 12, fontWeight: "500" },

  summaryItem: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginTop: 2 },
  bullet: { fontSize: 14, lineHeight: 21, fontWeight: "700" },
  summaryText: { flex: 1, fontSize: 14, lineHeight: 21 },

  transcriptText: { fontSize: 14, lineHeight: 23, marginTop: 2 },
  emptyText: { fontSize: 13, lineHeight: 20, marginTop: 2 },
});
