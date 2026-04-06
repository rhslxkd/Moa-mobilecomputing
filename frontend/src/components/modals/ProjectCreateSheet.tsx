/**
 * src/components/modals/ProjectCreateSheet.tsx
 *
 * 새 프로젝트 만들기 바텀시트
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import type { Project, Member } from "@/contexts/ProjectContext";
import Icon from "@/components/common/Icon";

// ── 유틸 ─────────────────────────────────────────────────────────
function isValidDate(s: string) {
  if (!/^\d{4}\.\d{2}\.\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split(".").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function fmtDate(raw: string): string {
  const n = raw.replace(/\D/g, "");
  if (n.length <= 4) return n;
  if (n.length <= 6) return `${n.slice(0, 4)}.${n.slice(4)}`;
  return `${n.slice(0, 4)}.${n.slice(4, 6)}.${n.slice(6, 8)}`;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

// ── 상수 ─────────────────────────────────────────────────────────
const COLOR_OPTIONS: { value: Project["color"]; label: string; hex: string }[] = [
  { value: "blue",   label: "파랑", hex: "#00A9EC" },
  { value: "purple", label: "보라", hex: "#7C3AED" },
  { value: "green",  label: "초록", hex: "#16A34A" },
];

const STATUS_OPTIONS: { value: Project["status"]; label: string }[] = [
  { value: "active",    label: "진행중" },
  { value: "upcoming",  label: "예정"   },
  { value: "completed", label: "완료"   },
];

const EMOJI_LIST = [
  "🚀","💡","📱","🤖","📊","🎨","🔧","📝",
  "🎯","🌐","💼","🔬","📡","🏗️","⚙️","🎓",
];

const ROLE_PRESETS = ["팀장", "개발자", "디자이너", "기획자", "데이터 분석", "QA"];

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (project: Project) => void;
}

export default function ProjectCreateSheet({ isOpen, onClose, onCreate }: Props) {
  const C = useTheme();

  const [name, setName]         = useState("");
  const [emoji, setEmoji]       = useState("🚀");
  const [color, setColor]       = useState<Project["color"]>("blue");
  const [status, setStatus]     = useState<Project["status"]>("upcoming");
  const [startDate, setStart]   = useState(todayStr);
  const [endDate, setEnd]       = useState("");
  const [members, setMembers]   = useState<Member[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);

  // 새 팀원 입력 상태
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);

  // 열릴 때마다 초기화
  useEffect(() => {
    if (isOpen) {
      setName("");
      setEmoji("🚀");
      setColor("blue");
      setStatus("upcoming");
      setStart(todayStr());
      setEnd("");
      setMembers([]);
      setShowEmoji(false);
      setShowAddRow(false);
      setNewMemberName("");
      setNewMemberRole("");
    }
  }, [isOpen]);

  function addMember() {
    if (!newMemberName.trim()) { Alert.alert("오류", "이름을 입력해주세요."); return; }
    if (!newMemberRole.trim()) { Alert.alert("오류", "역할을 입력해주세요."); return; }
    setMembers((prev) => [...prev, { id: uid(), name: newMemberName.trim(), role: newMemberRole.trim() }]);
    setNewMemberName(""); setNewMemberRole(""); setShowAddRow(false);
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function updateMemberRole(id: string, role: string) {
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, role } : m));
  }

  function handleCreate() {
    if (!name.trim())            { Alert.alert("오류", "프로젝트 이름을 입력해주세요."); return; }
    if (!isValidDate(startDate)) { Alert.alert("오류", "시작일 형식을 확인해주세요. (예: 2026.03.01)"); return; }
    if (!isValidDate(endDate))   { Alert.alert("오류", "마감일 형식을 확인해주세요. (예: 2026.05.08)"); return; }
    if (startDate >= endDate)    { Alert.alert("오류", "마감일은 시작일보다 늦어야 해요."); return; }
    if (members.length === 0)    { Alert.alert("오류", "팀원이 최소 1명 이상이어야 해요."); return; }

    const end   = new Date(endDate.replace(/\./g, "-"));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysLeft = Math.max(0, Math.round((end.getTime() - today.getTime()) / 86400000));

    const newProject: Project = {
      id: uid(),
      name: name.trim(),
      emoji,
      color,
      status,
      startDate,
      endDate,
      members,
      memberCount: members.length,
      daysLeft,
      hasChatAlert: false,
      hasTodoAlert: false,
    };

    onCreate(newProject);
    onClose();
  }

  return (
    <Modal visible={isOpen} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.sheet, { backgroundColor: C.bgCard }]}
        >
          <View style={[styles.handle, { backgroundColor: C.border }]} />

          {/* 헤더 */}
          <View style={[styles.sheetHeader, { borderBottomColor: C.border }]}>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Text style={[styles.cancel, { color: C.textMuted }]}>취소</Text>
            </TouchableOpacity>
            <Text style={[styles.sheetTitle, { color: C.text }]}>프로젝트 만들기</Text>
            <TouchableOpacity onPress={handleCreate} activeOpacity={0.7}>
              <Text style={styles.save}>만들기</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── 기본 정보 ── */}
            <SectionLabel label="기본 정보" C={C} />
            <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.border }]}>
              {/* 이모지 */}
              <TouchableOpacity style={[styles.row, { borderBottomColor: C.border }]} onPress={() => setShowEmoji((v) => !v)} activeOpacity={0.7}>
                <Text style={[styles.rowLabel, { color: C.text }]}>이모지</Text>
                <View style={styles.rowRight}>
                  <Text style={{ fontSize: 22 }}>{emoji}</Text>
                  <Icon name="chevron" size={16} color={C.textMuted} />
                </View>
              </TouchableOpacity>
              {showEmoji && (
                <View style={[styles.emojiGrid, { borderBottomColor: C.border }]}>
                  {EMOJI_LIST.map((e) => (
                    <TouchableOpacity key={e} onPress={() => { setEmoji(e); setShowEmoji(false); }}
                      style={[styles.emojiBtn, emoji === e && { backgroundColor: "#00A9EC20" }]} activeOpacity={0.7}>
                      <Text style={{ fontSize: 26 }}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {/* 이름 */}
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: C.text }]}>이름</Text>
                <TextInput style={[styles.input, { color: C.text }]} value={name} onChangeText={setName}
                  placeholder="프로젝트 이름" placeholderTextColor={C.textMuted} maxLength={30} autoFocus />
              </View>
            </View>

            {/* ── 색상 ── */}
            <SectionLabel label="프로젝트 색상" C={C} />
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt.value} onPress={() => setColor(opt.value)} activeOpacity={0.8}
                  style={[styles.colorChip, { backgroundColor: opt.hex + "20", borderColor: opt.hex },
                    color === opt.value && { borderWidth: 2.5 }]}>
                  <View style={[styles.colorDot, { backgroundColor: opt.hex }]} />
                  <Text style={[styles.colorLabel, { color: opt.hex }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── 기간 ── */}
            <SectionLabel label="프로젝트 기간" C={C} />
            <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.border }]}>
              <View style={[styles.row, { borderBottomColor: C.border }]}>
                <Text style={[styles.rowLabel, { color: C.text }]}>시작일</Text>
                <TextInput style={[styles.input, { color: C.text }]} value={startDate}
                  onChangeText={(v) => setStart(fmtDate(v))} placeholder="YYYY.MM.DD"
                  placeholderTextColor={C.textMuted} keyboardType="numeric" maxLength={10} />
              </View>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: C.text }]}>마감일</Text>
                <TextInput style={[styles.input, { color: C.text }]} value={endDate}
                  onChangeText={(v) => setEnd(fmtDate(v))} placeholder="YYYY.MM.DD"
                  placeholderTextColor={C.textMuted} keyboardType="numeric" maxLength={10} />
              </View>
            </View>

            {/* ── 상태 ── */}
            <SectionLabel label="상태" C={C} />
            <View style={styles.statusRow}>
              {STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt.value} onPress={() => setStatus(opt.value)} activeOpacity={0.7}
                  style={[styles.statusChip, status === opt.value
                    ? { backgroundColor: "#00A9EC", borderColor: "#00A9EC" }
                    : { backgroundColor: "transparent", borderColor: C.border }]}>
                  <Text style={[styles.statusLabel, { color: status === opt.value ? "#fff" : C.textSub }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── 팀원 ── */}
            <SectionLabel label={members.length > 0 ? `팀원 (${members.length}명)` : "팀원"} C={C} />
            <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.border }]}>
              {members.length === 0 && !showAddRow && (
                <View style={styles.emptyMembers}>
                  <Text style={[styles.emptyMembersText, { color: C.textMuted }]}>
                    아직 팀원이 없어요. 추가해보세요.
                  </Text>
                </View>
              )}

              {members.map((m, i) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  isLast={i === members.length - 1 && !showAddRow}
                  C={C}
                  onRoleChange={(role) => updateMemberRole(m.id, role)}
                  onRemove={() => removeMember(m.id)}
                />
              ))}

              {/* 새 팀원 입력 폼 */}
              {showAddRow && (
                <View style={[styles.addRow, { borderTopColor: C.border }]}>
                  <TextInput
                    style={[styles.addInput, { color: C.text, borderColor: C.border }]}
                    value={newMemberName}
                    onChangeText={setNewMemberName}
                    placeholder="이름"
                    placeholderTextColor={C.textMuted}
                    maxLength={10}
                  />
                  <TextInput
                    style={[styles.addInput, { color: C.text, borderColor: C.border, flex: 1.4 }]}
                    value={newMemberRole}
                    onChangeText={setNewMemberRole}
                    placeholder="역할"
                    placeholderTextColor={C.textMuted}
                    maxLength={10}
                  />
                  <TouchableOpacity onPress={addMember} activeOpacity={0.7} style={styles.addConfirm}>
                    <Icon name="add" size={20} color="#00A9EC" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setShowAddRow(false); setNewMemberName(""); setNewMemberRole(""); }}
                    activeOpacity={0.7} style={styles.addConfirm}>
                    <Icon name="back" size={20} color={C.textMuted} />
                  </TouchableOpacity>
                </View>
              )}

              {/* 역할 프리셋 */}
              {showAddRow && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.presetRow, { borderTopColor: C.border }]}>
                  {ROLE_PRESETS.map((r) => (
                    <TouchableOpacity key={r} onPress={() => setNewMemberRole(r)} activeOpacity={0.7}
                      style={[styles.presetChip, { borderColor: C.border },
                        newMemberRole === r && { backgroundColor: "#00A9EC15", borderColor: "#00A9EC" }]}>
                      <Text style={[styles.presetText, { color: newMemberRole === r ? "#00A9EC" : C.textMuted }]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* 팀원 추가 버튼 */}
              {!showAddRow && (
                <TouchableOpacity onPress={() => setShowAddRow(true)} activeOpacity={0.7}
                  style={[styles.addMemberBtn, members.length > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                  <Icon name="add" size={16} color="#00A9EC" />
                  <Text style={styles.addMemberText}>팀원 추가</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ height: 24 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── 팀원 행 ─────────────────────────────────────────────────────
function MemberRow({ member, isLast, C, onRoleChange, onRemove }: {
  member: Member;
  isLast: boolean;
  C: ReturnType<typeof useTheme>;
  onRoleChange: (role: string) => void;
  onRemove: () => void;
}) {
  return (
    <View style={[styles.memberRow, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
      <View style={[styles.avatar, { backgroundColor: "#00A9EC20" }]}>
        <Text style={[styles.avatarText, { color: "#00A9EC" }]}>{member.name.charAt(0)}</Text>
      </View>
      <Text style={[styles.memberName, { color: C.text }]}>{member.name}</Text>
      <TextInput
        style={[styles.roleInput, { color: C.textSub, borderColor: C.border }]}
        value={member.role}
        onChangeText={onRoleChange}
        placeholder="역할"
        placeholderTextColor={C.textMuted}
        maxLength={12}
      />
      <TouchableOpacity onPress={onRemove} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Icon name="stop" size={16} color={C.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ── 섹션 레이블 ──────────────────────────────────────────────────
function SectionLabel({ label, C }: { label: string; C: ReturnType<typeof useTheme> }) {
  return <Text style={[styles.sectionLabel, { color: C.textMuted }]}>{label}</Text>;
}

// ── 스타일 ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "92%" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 4 },

  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  sheetTitle: { fontSize: 16, fontWeight: "600" },
  cancel: { fontSize: 15 },
  save: { fontSize: 15, fontWeight: "600", color: "#00A9EC" },

  form: { padding: 16, gap: 0 },
  sectionLabel: { fontSize: 12, fontWeight: "500", marginBottom: 8, marginTop: 20, marginLeft: 4, textTransform: "uppercase", letterSpacing: 0.5 },

  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, gap: 12, minHeight: 50 },
  rowLabel: { fontSize: 15, fontWeight: "500", width: 56, flexShrink: 0 },
  rowRight: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  input: { flex: 1, fontSize: 15, textAlign: "right" },

  emojiGrid: { flexDirection: "row", flexWrap: "wrap", padding: 10, gap: 4, borderBottomWidth: 1 },
  emojiBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 10 },

  colorRow: { flexDirection: "row", gap: 10 },
  colorChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  colorLabel: { fontSize: 13, fontWeight: "600" },

  statusRow: { flexDirection: "row", gap: 8 },
  statusChip: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  statusLabel: { fontSize: 13, fontWeight: "500" },

  emptyMembers: { paddingHorizontal: 16, paddingVertical: 18, alignItems: "center" },
  emptyMembersText: { fontSize: 13 },

  memberRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 14, fontWeight: "700" },
  memberName: { fontSize: 14, fontWeight: "600", width: 60, flexShrink: 0 },
  roleInput: { flex: 1, fontSize: 13, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, textAlign: "center" },

  addMemberBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13 },
  addMemberText: { fontSize: 14, fontWeight: "500", color: "#00A9EC" },
  addRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderTopWidth: 1 },
  addInput: { flex: 1, fontSize: 14, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  addConfirm: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  presetRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderTopWidth: 1 },
  presetChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  presetText: { fontSize: 12, fontWeight: "500" },
});
