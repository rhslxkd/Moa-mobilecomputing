/**
 * app/(screens)/when2meet/[projectId].tsx
 * 프로젝트 일정 조율(When2Meet) 목록 + 생성
 */
import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import Icon from "@/components/common/Icon";
import CalendarPicker from "@/components/common/CalendarPicker";
import { MeetPollAPI, MeetPollDTO } from "@/services/api";

const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const wd = new Date(y, m - 1, d).getDay();
  return `${m}/${d}(${days[wd]})`;
};

export default function When2MeetListScreen() {
  const C = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();

  const [polls, setPolls] = useState<MeetPollDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [showCal, setShowCal] = useState(false);
  const [days, setDays] = useState(3);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(22);

  const load = useCallback(() => {
    if (!projectId) return;
    setLoading(true);
    MeetPollAPI.listByProject(projectId)
      .then(setPolls)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);
  useFocusEffect(load);

  const handleCreate = async () => {
    if (!projectId || !title.trim()) return;
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(toYmd(d));
    }
    try {
      const poll = await MeetPollAPI.create(projectId, {
        title: title.trim(), dates, start_hour: startHour, end_hour: endHour,
      });
      setCreateOpen(false);
      setTitle("");
      load();
      router.push(`/(screens)/when2meet/poll/${poll.id}` as any);
    } catch (e: any) {
      Alert.alert("생성 실패", e?.message ?? "일정 조율을 만들 수 없어요.");
    }
  };

  const Stepper = ({ label, value, set, min, max }: { label: string; value: number; set: (n: number) => void; min: number; max: number }) => (
    <View style={s.stepperRow}>
      <Text style={[s.stepperLabel, { color: C.textSub }]}>{label}</Text>
      <View style={s.stepperCtrl}>
        <TouchableOpacity onPress={() => set(Math.max(min, value - 1))} style={[s.stepBtn, { borderColor: C.border }]}>
          <Text style={[s.stepBtnText, { color: C.text }]}>−</Text>
        </TouchableOpacity>
        <Text style={[s.stepVal, { color: C.text }]}>{label.includes("시간") ? `${value}시` : `${value}일`}</Text>
        <TouchableOpacity onPress={() => set(Math.min(max, value + 1))} style={[s.stepBtn, { borderColor: C.border }]}>
          <Text style={[s.stepBtnText, { color: C.text }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]} edges={["bottom"]}>
      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}><Icon name="back" size={22} color={C.text} /></TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.text }]}>일정 조율</Text>
        <TouchableOpacity onPress={() => setCreateOpen(true)} style={s.iconBtn}><Icon name="add" size={22} color={C.primary} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {loading ? (
          <View style={{ alignItems: "center", paddingTop: 80 }}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : polls.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 80, gap: 8 }}>
            <Text style={{ fontSize: 40 }}>🗓️</Text>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>아직 일정 조율이 없어요</Text>
            <Text style={{ color: C.textMuted, fontSize: 13 }}>+ 버튼으로 가능한 시간을 모아보세요</Text>
          </View>
        ) : polls.map((p) => (
          <TouchableOpacity key={p.id} activeOpacity={0.8}
            onPress={() => router.push(`/(screens)/when2meet/poll/${p.id}` as any)}
            style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}
          >
            <Text style={[s.cardTitle, { color: C.text }]}>{p.title}</Text>
            <Text style={[s.cardMeta, { color: C.textMuted }]}>
              {p.dates.map(fmtDate).join(", ")} · {p.start_hour}~{p.end_hour}시 · 참여 {p.respondent_count}명
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 생성 모달 */}
      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <View style={s.backdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setCreateOpen(false)} />
          <View style={[s.modalBox, { backgroundColor: C.bgCard }]}>
            <Text style={[s.modalTitle, { color: C.text }]}>🗓️ 일정 조율 만들기</Text>
            <TextInput
              style={[s.input, { color: C.text, borderColor: C.border }]}
              placeholder="제목 (예: 다음 회의 시간)" placeholderTextColor={C.textMuted}
              value={title} onChangeText={setTitle}
            />
            <Text style={[s.label, { color: C.textMuted }]}>시작 날짜</Text>
            <TouchableOpacity onPress={() => setShowCal(v => !v)} style={[s.dueRow, { borderColor: showCal ? C.primary : C.border }]}>
              <Icon name="calendar" size={16} color={showCal ? C.primary : C.textMuted} />
              <Text style={{ color: C.text, fontSize: 14 }}>{toYmd(startDate)}</Text>
            </TouchableOpacity>
            {showCal && (
              <View style={[s.calWrap, { borderColor: C.border }]}>
                <CalendarPicker selected={startDate} onSelect={(d) => { setStartDate(d); setShowCal(false); }} />
              </View>
            )}
            <Stepper label="며칠간" value={days} set={setDays} min={1} max={7} />
            <Stepper label="시작 시간" value={startHour} set={setStartHour} min={0} max={endHour - 1} />
            <Stepper label="종료 시간" value={endHour} set={setEndHour} min={startHour + 1} max={24} />

            <View style={s.btnRow}>
              <TouchableOpacity style={[s.btn, { borderColor: C.border }]} onPress={() => setCreateOpen(false)}>
                <Text style={{ color: C.textSub, fontWeight: "600" }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { backgroundColor: C.primary, borderColor: C.primary }]} onPress={handleCreate} disabled={!title.trim()}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>만들기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", textAlign: "center" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardMeta: { fontSize: 12, lineHeight: 18 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", paddingHorizontal: 24 },
  modalBox: { borderRadius: 18, padding: 20, gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  label: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  dueRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  calWrap: { borderWidth: 1, borderRadius: 12, padding: 8 },
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  stepperLabel: { fontSize: 13, fontWeight: "600" },
  stepperCtrl: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontSize: 18, fontWeight: "700" },
  stepVal: { fontSize: 14, fontWeight: "700", minWidth: 36, textAlign: "center" },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
});
