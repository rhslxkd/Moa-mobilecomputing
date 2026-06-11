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
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import Icon from "@/components/common/Icon";
import { MeetingAPI, MeetingDTO, ProjectAPI, MemberDTO } from "@/services/api";

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
  const [members, setMembers] = useState<MemberDTO[]>([]);
  // 화자번호 → member_id 매핑 (UI 편집용)
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [savingMap, setSavingMap] = useState(false);
  const [addingIdx, setAddingIdx] = useState<number | null>(null);
  // 할 일 추가 모달
  const [actionModalIdx, setActionModalIdx] = useState<number | null>(null);
  const [actionTitle, setActionTitle] = useState("");
  const [actionAssignee, setActionAssignee] = useState<string | null>(null);

  const openActionModal = (index: number) => {
    const it = meeting?.action_items[index];
    setActionTitle(it?.title ?? "");
    setActionAssignee(null);
    setActionModalIdx(index);
  };

  const confirmAddActionItem = async () => {
    if (!meetingId || actionModalIdx === null) return;
    const idx = actionModalIdx;
    setActionModalIdx(null);
    setAddingIdx(idx);
    try {
      const updated = await MeetingAPI.addActionItem(meetingId, idx, {
        title: actionTitle.trim() || undefined,
        assignee_member_id: actionAssignee ?? undefined,
      });
      setMeeting(updated);
    } catch {
      // noop
    } finally {
      setAddingIdx(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!meetingId) return;
      setLoading(true);
      MeetingAPI.get(meetingId)
        .then((m) => {
          setMeeting(m);
          // 기존 매칭(participants.speaker_label) 복원
          const init: Record<string, string> = {};
          m.participants.forEach((p) => {
            if (p.member_id && p.speaker_label) {
              // speaker_label은 "1,3,5"처럼 여러 화자가 한 멤버에 묶일 수 있음
              p.speaker_label.split(",").forEach((sp) => {
                if (sp) init[sp] = p.member_id!;
              });
            }
          });
          setMapping(init);
          if (m.project_id) {
            ProjectAPI.get(m.project_id)
              .then((proj) => setMembers(proj.members))
              .catch(() => setMembers([]));
          }
        })
        .catch(() => setMeeting(null))
        .finally(() => setLoading(false));
    }, [meetingId])
  );

  const speakers = meeting?.speaker_stats ? Object.keys(meeting.speaker_stats).sort() : [];
  const totalSpeak = speakers.reduce((sum, sp) => sum + (meeting!.speaker_stats[sp] || 0), 0);

  const saveMapping = async () => {
    if (!meetingId) return;
    setSavingMap(true);
    try {
      const mappings = speakers.map((sp) => ({ speaker: sp, member_id: mapping[sp] || undefined }));
      const updated = await MeetingAPI.setSpeakerMapping(meetingId, mappings);
      setMeeting(updated);
    } catch {
      // noop
    } finally {
      setSavingMap(false);
    }
  };

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

          {/* 출석 */}
          {(meeting.attendance.length > 0 || meeting.absentees.length > 0) && (
            <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <Text style={[s.sectionTitle, { color: C.text }]}>🙋 출석</Text>
              {meeting.attendance.map((a) => {
                const late = (a.late_seconds ?? 0) >= 120;
                return (
                  <View key={a.user_id} style={s.attRow}>
                    <Text style={[s.attName, { color: C.text }]}>{a.name}</Text>
                    <Text style={[s.attBadge, { color: late ? "#D97706" : "#16A34A" }]}>
                      {late ? `지각 ${Math.round((a.late_seconds ?? 0) / 60)}분` : "정시"}
                      {a.reason ? ` · ${a.reason}` : ""}
                    </Text>
                  </View>
                );
              })}
              {meeting.absentees.map((a) => (
                <View key={a.member_id ?? a.user_id ?? a.name} style={s.attRow}>
                  <Text style={[s.attName, { color: C.textMuted }]}>{a.name}</Text>
                  <Text style={[s.attBadge, { color: "#DC2626" }]}>
                    불참{a.reason ? ` · ${a.reason}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* 회의에서 나온 할 일 */}
          {meeting.action_items.length > 0 && (
            <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <Text style={[s.sectionTitle, { color: C.text }]}>📋 회의에서 나온 할 일</Text>
              <Text style={[s.emptyText, { color: C.textMuted }]}>추가할 항목만 골라 Todo로 등록하세요.</Text>
              {meeting.action_items.map((it, i) => (
                <View key={i} style={s.actionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.actionTitle, { color: C.text }]}>{it.title}</Text>
                    {it.date ? <Text style={[s.actionDate, { color: C.textMuted }]}>📅 {it.date}</Text> : null}
                  </View>
                  {it.added ? (
                    <View style={[s.addedChip, { backgroundColor: "#16A34A18" }]}>
                      <Text style={{ color: "#16A34A", fontSize: 12, fontWeight: "700" }}>✓ 추가됨</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[s.addBtn, { backgroundColor: C.primary }]}
                      activeOpacity={0.8}
                      disabled={addingIdx === i}
                      onPress={() => openActionModal(i)}
                    >
                      {addingIdx === i
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={s.addBtnText}>Todo 추가</Text>}
                    </TouchableOpacity>
                  )}
                </View>
              ))}
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

          {/* 키워드 */}
          {meeting.keywords && meeting.keywords.length > 0 && (
            <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <Text style={[s.sectionTitle, { color: C.text }]}>🔑 키워드</Text>
              <View style={s.keywordRow}>
                {meeting.keywords.map((kw, i) => (
                  <View key={i} style={[s.keywordChip, { backgroundColor: C.primary + "12", borderColor: C.primary + "30" }]}>
                    <Text style={[s.keywordText, { color: C.primary }]}>{kw}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 화자별 발언 + 멤버 매칭 */}
          {speakers.length > 0 && (
            <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>
              <Text style={[s.sectionTitle, { color: C.text }]}>🎤 화자별 발언 / 멤버 매칭</Text>
              <Text style={[s.speakerHint, { color: C.textMuted }]}>
                AI가 발언 속 이름으로 자동 매칭했어요. 틀린 부분만 바꿔주세요. (여러 화자 → 한 명 가능)
              </Text>
              {speakers.map((sp) => {
                const sec = meeting.speaker_stats[sp] || 0;
                const pct = totalSpeak > 0 ? Math.round((sec / totalSpeak) * 100) : 0;
                return (
                  <View key={sp} style={s.speakerBlock}>
                    <View style={s.speakerHeader}>
                      <Text style={[s.speakerName, { color: C.text }]}>화자 {sp}</Text>
                      <Text style={[s.speakerMeta, { color: C.textMuted }]}>
                        {formatDuration(Math.round(sec))} · {pct}%
                      </Text>
                    </View>
                    <View style={[s.barTrack, { backgroundColor: C.bgMuted }]}>
                      <View style={[s.barFill, { width: `${pct}%`, backgroundColor: C.primary }]} />
                    </View>
                    {/* 화자 대표 발언 (누구인지 식별용) */}
                    {meeting.speaker_samples?.[sp] ? (
                      <Text style={[s.speakerSample, { color: C.textSub }]} numberOfLines={2}>
                        “{meeting.speaker_samples[sp]}”
                      </Text>
                    ) : null}
                    {/* 멤버 선택 칩 */}
                    {members.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.memberChipRow}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => setMapping((prev) => { const n = { ...prev }; delete n[sp]; return n; })}
                          style={[s.memberChip, { borderColor: C.border }, !mapping[sp] && { backgroundColor: C.primary, borderColor: C.primary }]}
                        >
                          <Text style={[s.memberChipText, { color: !mapping[sp] ? "#fff" : C.textMuted }]}>없음</Text>
                        </TouchableOpacity>
                        {members.map((m) => {
                          const active = mapping[sp] === m.id;
                          return (
                            <TouchableOpacity
                              key={m.id}
                              activeOpacity={0.7}
                              onPress={() => setMapping((prev) => ({ ...prev, [sp]: m.id }))}
                              style={[s.memberChip, { borderColor: C.border }, active && { backgroundColor: C.primary, borderColor: C.primary }]}
                            >
                              <Text style={[s.memberChipText, { color: active ? "#fff" : C.text }]}>{m.name}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                );
              })}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={saveMapping}
                disabled={savingMap}
                style={[s.saveBtn, { backgroundColor: C.primary }]}
              >
                {savingMap ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.saveBtnText}>매칭 저장</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

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

      {/* 할 일 추가 모달 — 제목 + 담당자 선택 */}
      <Modal visible={actionModalIdx !== null} transparent animationType="fade" onRequestClose={() => setActionModalIdx(null)}>
        <View style={s.modalBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setActionModalIdx(null)} />
          <View style={[s.modalBox, { backgroundColor: C.bgCard }]}>
            <Text style={[s.modalTitle, { color: C.text }]}>📋 할 일 추가</Text>

            <Text style={[s.modalLabel, { color: C.textMuted }]}>제목</Text>
            <TextInput
              style={[s.modalInput, { color: C.text, borderColor: C.border }]}
              value={actionTitle}
              onChangeText={setActionTitle}
              placeholder="할 일 제목"
              placeholderTextColor={C.textMuted}
            />

            <Text style={[s.modalLabel, { color: C.textMuted }]}>담당자 (역할)</Text>
            {members.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.memberChipRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActionAssignee(null)}
                  style={[s.memberChip, { borderColor: C.border }, !actionAssignee && { backgroundColor: C.primary, borderColor: C.primary }]}
                >
                  <Text style={[s.memberChipText, { color: !actionAssignee ? "#fff" : C.textMuted }]}>미배정</Text>
                </TouchableOpacity>
                {members.map((m) => {
                  const active = actionAssignee === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      activeOpacity={0.7}
                      onPress={() => setActionAssignee(m.id)}
                      style={[s.memberChip, { borderColor: C.border }, active && { backgroundColor: C.primary, borderColor: C.primary }]}
                    >
                      <Text style={[s.memberChipText, { color: active ? "#fff" : C.text }]}>
                        {m.name}{m.roles?.length ? ` · ${m.roles[0]}` : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={[s.emptyText, { color: C.textMuted }]}>프로젝트 회의가 아니면 미배정으로 추가돼요.</Text>
            )}

            <View style={s.modalBtnRow}>
              <TouchableOpacity style={[s.modalBtn, { borderColor: C.border }]} onPress={() => setActionModalIdx(null)}>
                <Text style={{ color: C.textSub, fontWeight: "600" }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: C.primary, borderColor: C.primary }]}
                onPress={confirmAddActionItem}
                disabled={!actionTitle.trim()}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>추가</Text>
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

  attRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 5 },
  attName: { fontSize: 14, fontWeight: "600" },
  attBadge: { fontSize: 12, fontWeight: "600", flexShrink: 1, textAlign: "right", marginLeft: 8 },

  actionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(127,127,127,0.2)" },
  actionTitle: { fontSize: 14, fontWeight: "500" },
  actionDate: { fontSize: 12, marginTop: 2 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, minWidth: 76, alignItems: "center" },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  addedChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", paddingHorizontal: 24 },
  modalBox: { borderRadius: 18, padding: 20, gap: 8 },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  modalLabel: { fontSize: 12, fontWeight: "600", marginTop: 8 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  modalBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },

  keywordRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  keywordChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  keywordText: { fontSize: 13, fontWeight: "600" },

  speakerHint: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  speakerSample: { fontSize: 13, lineHeight: 19, fontStyle: "italic", marginTop: 2 },
  speakerBlock: { gap: 6, marginTop: 8 },
  speakerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  speakerName: { fontSize: 14, fontWeight: "700" },
  speakerMeta: { fontSize: 12 },
  barTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
  memberChipRow: { gap: 8, paddingVertical: 2, paddingRight: 4 },
  memberChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  memberChipText: { fontSize: 12, fontWeight: "600" },
  saveBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
