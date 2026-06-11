/**
 * app/(screens)/meeting/finalize.tsx
 * 녹음 종료 후 — 출석/지각/불참 확인 + 사유 입력 → AI 요약 생성
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import Icon from "@/components/common/Icon";
import { MeetingAPI, MeetingAttendanceDTO, MeetingAbsenteeDTO } from "@/services/api";

export default function MeetingFinalizeScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { meetingId, duration, audioUri } = useLocalSearchParams<{ meetingId: string; duration: string; audioUri: string }>();

  const [attendees, setAttendees] = useState<MeetingAttendanceDTO[]>([]);
  const [absentees, setAbsentees] = useState<MeetingAbsenteeDTO[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({}); // key: user_id 또는 m:member_id
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!meetingId) return;
    MeetingAPI.attendance(meetingId)
      .then((r) => { setAttendees(r.attendees); setAbsentees(r.absentees); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [meetingId]);

  const fmtLate = (sec: number) => (sec >= 120 ? `지각 ${Math.round(sec / 60)}분` : "정시");

  const handleFinish = useCallback(async () => {
    if (!meetingId || processing) return;
    setProcessing(true);
    try {
      // 사유 정리
      const reasonEntries: { user_id?: string; member_id?: string; reason: string }[] = [];
      attendees.forEach((a) => {
        const r = reasons[a.user_id];
        if (r?.trim()) reasonEntries.push({ user_id: a.user_id, reason: r.trim() });
      });
      absentees.forEach((a) => {
        const key = a.user_id ?? `m:${a.member_id}`;
        const r = reasons[key];
        if (r?.trim()) {
          if (a.user_id) reasonEntries.push({ user_id: a.user_id, reason: r.trim() });
          else if (a.member_id) reasonEntries.push({ member_id: a.member_id, reason: r.trim() });
        }
      });
      await MeetingAPI.finalize(meetingId, {
        duration_seconds: Number(duration ?? 0),
        reasons: reasonEntries,
      });
      // 오디오 업로드 → STT + AI 요약/할일 추출
      if (audioUri) {
        await MeetingAPI.uploadAudio(meetingId, audioUri);
      }
      router.replace("/(screens)/meeting" as any);
    } catch (e: any) {
      Alert.alert("처리 오류", e?.message ?? "회의록 생성 중 오류가 발생했어요. 회의는 저장됐습니다.");
      router.replace("/(screens)/meeting" as any);
    } finally {
      setProcessing(false);
    }
  }, [meetingId, duration, audioUri, attendees, absentees, reasons, processing, router]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["bottom"]}>
      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border, paddingTop: insets.top + 8 }]}>
        <View style={s.iconBtn} />
        <Text style={[s.headerTitle, { color: C.text }]}>출석 확인 / 사유 입력</Text>
        <View style={s.iconBtn} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          <Text style={[s.hint, { color: C.textMuted }]}>
            지각/불참한 팀원의 사유를 적으면 AI 평가에서 불이익을 받지 않아요. (예: 아파서 불참)
          </Text>

          {/* 출석자 */}
          <Text style={[s.sectionTitle, { color: C.text }]}>🙋 출석 ({attendees.length})</Text>
          {attendees.map((a) => {
            const late = (a.late_seconds ?? 0) >= 120;
            return (
              <View key={a.user_id} style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                <View style={s.rowBetween}>
                  <Text style={[s.name, { color: C.text }]}>{a.name}</Text>
                  <Text style={[s.badge, { color: late ? "#D97706" : "#16A34A", backgroundColor: (late ? "#D97706" : "#16A34A") + "18" }]}>
                    {fmtLate(a.late_seconds ?? 0)}
                  </Text>
                </View>
                {late && (
                  <TextInput
                    style={[s.input, { color: C.text, borderColor: C.border }]}
                    placeholder="지각 사유 (선택)"
                    placeholderTextColor={C.textMuted}
                    value={reasons[a.user_id] ?? ""}
                    onChangeText={(v) => setReasons((p) => ({ ...p, [a.user_id]: v }))}
                  />
                )}
              </View>
            );
          })}

          {/* 불참자 */}
          {absentees.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { color: C.text, marginTop: 8 }]}>🚫 불참 ({absentees.length})</Text>
              {absentees.map((a) => {
                const key = a.user_id ?? `m:${a.member_id}`;
                return (
                  <View key={key} style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
                    <View style={s.rowBetween}>
                      <Text style={[s.name, { color: C.text }]}>{a.name}</Text>
                      <Text style={[s.badge, { color: "#DC2626", backgroundColor: "#DC262618" }]}>불참</Text>
                    </View>
                    <TextInput
                      style={[s.input, { color: C.text, borderColor: C.border }]}
                      placeholder="불참 사유 (예: 아파서 불참)"
                      placeholderTextColor={C.textMuted}
                      value={reasons[key] ?? ""}
                      onChangeText={(v) => setReasons((p) => ({ ...p, [key]: v }))}
                    />
                  </View>
                );
              })}
            </>
          )}

          <TouchableOpacity
            style={[s.finishBtn, { backgroundColor: C.primary }]}
            activeOpacity={0.85}
            onPress={handleFinish}
            disabled={processing}
          >
            <Icon name="file" size={18} color="#fff" />
            <Text style={s.finishText}>{processing ? "AI 회의록 생성 중…" : "완료 · AI 요약 생성"}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {processing && (
        <View style={s.overlay}>
          <View style={[s.overlayBox, { backgroundColor: C.bgCard }]}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={[s.overlayText, { color: C.text }]}>AI가 회의록을 정리하고 있어요…</Text>
            <Text style={[s.overlaySub, { color: C.textMuted }]}>전사·요약·할 일 추출 중입니다.</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", textAlign: "center" },
  iconBtn: { width: 40, height: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { padding: 16, gap: 10, paddingBottom: 40 },
  hint: { fontSize: 13, lineHeight: 19, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 15, fontWeight: "600" },
  badge: { fontSize: 12, fontWeight: "700", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: "hidden" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  finishBtn: { marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, borderRadius: 14 },
  finishText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  overlayBox: { width: "100%", borderRadius: 20, paddingVertical: 32, paddingHorizontal: 24, alignItems: "center", gap: 10 },
  overlayText: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  overlaySub: { fontSize: 13, textAlign: "center" },
});
