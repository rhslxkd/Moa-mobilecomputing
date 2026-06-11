/**
 * app/(screens)/when2meet/poll/[pollId].tsx
 * 일정 조율 격자 — 내 가능 시간 선택 + 전체 히트맵 결과
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import Icon from "@/components/common/Icon";
import { MeetPollAPI, MeetPollDetailDTO } from "@/services/api";

const PRIMARY = "#00A9EC";
const slotKey = (date: string, hour: number) => `${date} ${hour}`;
const fmtDateShort = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return { top: `${m}/${d}`, wd: days[new Date(y, m - 1, d).getDay()] };
};

export default function When2MeetGridScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pollId } = useLocalSearchParams<{ pollId: string }>();

  const [poll, setPoll] = useState<MeetPollDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(() => {
    if (!pollId) return;
    MeetPollAPI.get(pollId)
      .then((p) => { setPoll(p); setMine(new Set(p.my_slots)); setDirty(false); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [pollId]);
  useEffect(load, [load]);

  const toggle = (key: string) => {
    setMine((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
    setDirty(true);
  };

  const save = async () => {
    if (!pollId) return;
    setSaving(true);
    try {
      const updated = await MeetPollAPI.setAvailability(pollId, Array.from(mine));
      setPoll(updated);
      setMine(new Set(updated.my_slots));
      setDirty(false);
    } catch (e: any) {
      Alert.alert("저장 실패", e?.message ?? "저장할 수 없어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!pollId) return;
    Alert.alert("삭제", "이 일정 조율을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: async () => {
        await MeetPollAPI.delete(pollId).catch(() => {});
        router.back();
      }},
    ]);
  };

  if (loading || !poll) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
        <View style={s.center}><ActivityIndicator size="large" color={C.primary} /></View>
      </SafeAreaView>
    );
  }

  const total = poll.total_respondents || 0;
  const hours: number[] = [];
  for (let h = poll.start_hour; h < poll.end_hour; h++) hours.push(h);

  const COL_W = 52;
  const ROW_H = 34;

  const cellColor = (count: number) => {
    if (count <= 0) return "transparent";
    const ratio = total > 0 ? count / total : 0;
    const alpha = Math.round((0.18 + 0.82 * ratio) * 255).toString(16).padStart(2, "0");
    return PRIMARY + alpha;
  };

  // 추천(전원 가능) 슬롯 텍스트
  const bestText = poll.best_slots.length > 0
    ? poll.best_slots.slice(0, 6).map((sk) => {
        const [date, h] = sk.split(" ");
        const { top } = fmtDateShort(date);
        return `${top} ${h}시`;
      }).join(", ")
    : null;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["bottom"]}>
      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}><Icon name="back" size={22} color={C.text} /></TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.text }]} numberOfLines={1}>{poll.title}</Text>
        <TouchableOpacity onPress={handleDelete} style={s.iconBtn}><Icon name="stop" size={18} color={C.textMuted} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={[s.guide, { color: C.textMuted }]}>
          가능한 시간을 탭하세요. 진할수록 많이 겹친 시간이에요. (참여 {total}명)
        </Text>

        {/* 격자 */}
        <ScrollView horizontal showsHorizontalScrollIndicator style={{ paddingHorizontal: 12 }}>
          <View>
            {/* 날짜 헤더 */}
            <View style={{ flexDirection: "row" }}>
              <View style={{ width: 40 }} />
              {poll.dates.map((d) => {
                const { top, wd } = fmtDateShort(d);
                return (
                  <View key={d} style={{ width: COL_W, alignItems: "center" }}>
                    <Text style={{ color: C.text, fontSize: 12, fontWeight: "700" }}>{top}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 10 }}>{wd}</Text>
                  </View>
                );
              })}
            </View>
            {/* 시간 행 */}
            {hours.map((h) => (
              <View key={h} style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: 40 }}>
                  <Text style={{ color: C.textMuted, fontSize: 11, textAlign: "right", paddingRight: 6 }}>{h}시</Text>
                </View>
                {poll.dates.map((d) => {
                  const key = slotKey(d, h);
                  const count = poll.counts[key] ?? 0;
                  const isMine = mine.has(key);
                  return (
                    <TouchableOpacity
                      key={key}
                      activeOpacity={0.7}
                      onPress={() => toggle(key)}
                      style={{
                        width: COL_W - 4, height: ROW_H - 4, margin: 2, borderRadius: 6,
                        backgroundColor: cellColor(count),
                        borderWidth: isMine ? 2 : StyleSheet.hairlineWidth,
                        borderColor: isMine ? PRIMARY : C.border,
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {count > 0 && (
                        <Text style={{ fontSize: 11, fontWeight: "700", color: count / Math.max(1, total) > 0.5 ? "#fff" : C.textSub }}>{count}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* 추천 시간 */}
        <View style={[s.bestCard, { backgroundColor: C.primary + "10", borderColor: C.primary + "30" }]}>
          <Text style={[s.bestTitle, { color: C.primary }]}>⭐ 전원 가능한 시간</Text>
          <Text style={[s.bestBody, { color: C.textSub }]}>
            {bestText ?? "아직 전원이 겹치는 시간이 없어요. 더 많은 멤버가 참여하면 표시됩니다."}
          </Text>
        </View>

        {/* 참여자 */}
        {poll.respondents.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            <Text style={{ color: C.textMuted, fontSize: 12 }}>
              참여: {poll.respondents.map((r) => r.name).join(", ")}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 저장 바 */}
      <View style={[s.saveBar, { backgroundColor: C.bgCard, borderTopColor: C.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: dirty ? C.primary : C.bgMuted }]}
          onPress={save} disabled={!dirty || saving} activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={[s.saveText, { color: dirty ? "#fff" : C.textMuted }]}>{dirty ? "내 가능 시간 저장" : "저장됨"}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", textAlign: "center" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  guide: { fontSize: 13, lineHeight: 19, padding: 16 },
  bestCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  bestTitle: { fontSize: 14, fontWeight: "700" },
  bestBody: { fontSize: 13, lineHeight: 20 },
  saveBar: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 10 },
  saveBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  saveText: { fontSize: 15, fontWeight: "700" },
});
