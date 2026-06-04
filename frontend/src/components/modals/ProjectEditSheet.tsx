/**
 * src/components/modals/ProjectEditSheet.tsx
 *
 * 프로젝트 수정 바텀시트
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
import { FriendsAPI, FriendDTO } from "@/services/api";
import Icon from "@/components/common/Icon";
import ColorPickerSheet from "@/components/modals/ColorPickerSheet";

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
  return Math.random().toString(36).slice(2, 9);
}

// ── 상수 ─────────────────────────────────────────────────────────

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

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  팀장:          { bg: "#FFF3CD", color: "#B45309" },
  개발자:        { bg: "#E0F2FE", color: "#0369A1" },
  디자이너:      { bg: "#F3E8FF", color: "#7C3AED" },
  기획자:        { bg: "#DCFCE7", color: "#16A34A" },
  "데이터 분석": { bg: "#FEE2E2", color: "#DC2626" },
  QA:            { bg: "#F1F5F9", color: "#64748B" },
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
interface Props {
  isOpen: boolean;
  project: Project;
  onClose: () => void;
  onSave: (updated: Project) => void;
}

export default function ProjectEditSheet({ isOpen, project, onClose, onSave }: Props) {
  const C = useTheme();

  const [name, setName]         = useState(project.name);
  const [emoji, setEmoji]       = useState(project.emoji);
  const [color, setColor]       = useState<string>(project.color);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [status, setStatus]     = useState<Project["status"]>(project.status);
  const [startDate, setStart]   = useState(project.startDate);
  const [endDate, setEnd]       = useState(project.endDate);
  const [members, setMembers]   = useState<Member[]>(project.members);
  const [showEmoji, setShowEmoji] = useState(false);

  // 새 팀원 입력 상태
  const [newName, setNewName] = useState("");
  const [newRoles, setNewRoles] = useState<string[]>([]);
  const [newRoleInput, setNewRoleInput] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);
  const [friends, setFriends] = useState<FriendDTO[]>([]);

  useEffect(() => {
    if (isOpen) FriendsAPI.list().then(setFriends).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    setName(project.name);
    setEmoji(project.emoji);
    setColor(project.color);
    setStatus(project.status);
    setStart(project.startDate);
    setEnd(project.endDate);
    setMembers([...project.members]);
    setShowEmoji(false);
    setColorPickerOpen(false);
    setShowAddRow(false);
    setNewName(""); setNewRoles([]); setNewRoleInput("");
  }, [project.id, isOpen]);

  function addMember() {
    const trimmed = newName.trim();
    if (!trimmed) { Alert.alert("오류", "이름을 입력해주세요."); return; }
    if (newRoles.length === 0) { Alert.alert("오류", "역할을 최소 1개 선택해주세요."); return; }
    // 친구 이름/아이디와 일치하면 실제 계정 연결 → 초대 처리
    const matched = friends.find((f) => f.name === trimmed || f.username === trimmed);
    setMembers((prev) => [...prev, {
      id: uid(),
      userId: matched?.user_id,
      name: matched?.name ?? trimmed,
      roles: newRoles,
    }]);
    setNewName(""); setNewRoles([]); setNewRoleInput(""); setShowAddRow(false);
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function updateMemberRoles(id: string, roles: string[]) {
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, roles } : m));
  }

  function toggleNewRole(role: string) {
    setNewRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  }

  function addCustomNewRole() {
    const trimmed = newRoleInput.trim();
    if (!trimmed || newRoles.includes(trimmed)) { setNewRoleInput(""); return; }
    setNewRoles(prev => [...prev, trimmed]);
    setNewRoleInput("");
  }

  function handleSave() {
    if (!name.trim())          { Alert.alert("오류", "프로젝트 이름을 입력해주세요."); return; }
    if (!isValidDate(startDate)) { Alert.alert("오류", "시작일 형식을 확인해주세요. (예: 2026.03.01)"); return; }
    if (!isValidDate(endDate))   { Alert.alert("오류", "마감일 형식을 확인해주세요. (예: 2026.05.08)"); return; }
    if (startDate >= endDate)    { Alert.alert("오류", "마감일은 시작일보다 늦어야 해요."); return; }
    if (members.length === 0)    { Alert.alert("오류", "팀원이 최소 1명 이상이어야 해요."); return; }

    const end = new Date(endDate.replace(/\./g, "-"));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysLeft = Math.max(0, Math.round((end.getTime() - today.getTime()) / 86400000));

    onSave({ ...project, name: name.trim(), emoji, color, status, startDate, endDate, members, memberCount: members.length, daysLeft });
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
            <Text style={[styles.sheetTitle, { color: C.text }]}>프로젝트 수정</Text>
            <TouchableOpacity onPress={handleSave} activeOpacity={0.7}>
              <Text style={styles.save}>저장</Text>
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
                  placeholder="프로젝트 이름" placeholderTextColor={C.textMuted} maxLength={30} />
              </View>
            </View>

            {/* ── 색상 ── */}
            <SectionLabel label="프로젝트 색상" C={C} />
            <TouchableOpacity
              onPress={() => setColorPickerOpen(true)}
              activeOpacity={0.7}
              style={[styles.colorRow, { backgroundColor: C.bg, borderColor: C.border }]}
            >
              <Text style={[styles.rowLabel, { color: C.text }]}>색상</Text>
              <View style={styles.rowRight}>
                <View style={[styles.colorPreviewDot, { backgroundColor: color }]} />
                <Icon name="chevron" size={16} color={C.textMuted} />
              </View>
            </TouchableOpacity>

            <ColorPickerSheet
              visible={colorPickerOpen}
              selected={color}
              onSelect={setColor}
              onClose={() => setColorPickerOpen(false)}
            />

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
            <SectionLabel label={`팀원 (${members.length}명)`} C={C} />
            <View style={[styles.card, { backgroundColor: C.bg, borderColor: C.border }]}>
              {members.map((m, i) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  isLast={i === members.length - 1 && !showAddRow}
                  C={C}
                  onRolesChange={(roles) => updateMemberRoles(m.id, roles)}
                  onRemove={() => removeMember(m.id)}
                />
              ))}

              {/* 새 팀원 입력 폼 */}
              {showAddRow && (
                <>
                  <View style={[styles.addRow, { borderTopColor: C.border }]}>
                    <TextInput
                      style={[styles.addInput, { color: C.text, borderColor: C.border, flex: 1 }]}
                      value={newName}
                      onChangeText={setNewName}
                      placeholder="이름"
                      placeholderTextColor={C.textMuted}
                      maxLength={10}
                    />
                    <TouchableOpacity onPress={addMember} activeOpacity={0.7} style={styles.addConfirm}>
                      <Icon name="add" size={20} color="#00A9EC" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setShowAddRow(false); setNewName(""); setNewRoles([]); setNewRoleInput(""); }}
                      activeOpacity={0.7} style={styles.addConfirm}>
                      <Icon name="back" size={20} color={C.textMuted} />
                    </TouchableOpacity>
                  </View>
                  {/* 선택된 역할 칩들 */}
                  {newRoles.length > 0 && (
                    <View style={[styles.selectedRolesRow, { borderTopColor: C.border }]}>
                      {newRoles.map(r => {
                        const rc = ROLE_COLORS[r] ?? { bg: "#F1F5F9", color: "#64748B" };
                        return (
                          <TouchableOpacity key={r} onPress={() => toggleNewRole(r)} activeOpacity={0.7}
                            style={[styles.roleTag, { backgroundColor: rc.bg }]}>
                            <Text style={[styles.roleTagText, { color: rc.color }]}>{r}</Text>
                            <Text style={[styles.roleTagX, { color: rc.color }]}>×</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  {/* 직접 입력 */}
                  <View style={[styles.customRoleRow, { borderTopColor: C.border }]}>
                    <TextInput
                      style={[styles.customRoleInput, { color: C.text, borderColor: C.border }]}
                      value={newRoleInput}
                      onChangeText={setNewRoleInput}
                      placeholder="역할 직접 입력"
                      placeholderTextColor={C.textMuted}
                      maxLength={12}
                      onSubmitEditing={addCustomNewRole}
                    />
                    <TouchableOpacity onPress={addCustomNewRole} activeOpacity={0.7} style={styles.addConfirm}>
                      <Icon name="add" size={18} color="#00A9EC" />
                    </TouchableOpacity>
                  </View>
                  {/* 역할 프리셋 */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.presetRow, { borderTopColor: C.border }]}>
                    {ROLE_PRESETS.map((r) => (
                      <TouchableOpacity key={r} onPress={() => toggleNewRole(r)} activeOpacity={0.7}
                        style={[styles.presetChip, { borderColor: C.border },
                          newRoles.includes(r) && { backgroundColor: "#00A9EC15", borderColor: "#00A9EC" }]}>
                        <Text style={[styles.presetText, { color: newRoles.includes(r) ? "#00A9EC" : C.textMuted }]}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* 팀원 추가 버튼 */}
              {!showAddRow && (
                <TouchableOpacity onPress={() => setShowAddRow(true)} activeOpacity={0.7}
                  style={[styles.addMemberBtn, { borderTopColor: C.border }]}>
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
function MemberRow({ member, isLast, C, onRolesChange, onRemove }: {
  member: Member;
  isLast: boolean;
  C: ReturnType<typeof useTheme>;
  onRolesChange: (roles: string[]) => void;
  onRemove: () => void;
}) {
  const [addingRole, setAddingRole] = useState(false);
  const [roleInput, setRoleInput] = useState("");

  const addRole = (role: string) => {
    const trimmed = role.trim();
    if (!trimmed || member.roles.includes(trimmed)) { setRoleInput(""); return; }
    onRolesChange([...member.roles, trimmed]);
    setRoleInput("");
    setAddingRole(false);
  };

  const removeRole = (role: string) => {
    onRolesChange(member.roles.filter(r => r !== role));
  };

  return (
    <View style={[styles.memberBlock, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
      {/* 이름 + 삭제 */}
      <View style={styles.memberTopRow}>
        <View style={[styles.avatar, { backgroundColor: "#00A9EC20" }]}>
          <Text style={[styles.avatarText, { color: "#00A9EC" }]}>{member.name.charAt(0)}</Text>
        </View>
        <Text style={[styles.memberName, { color: C.text }]}>{member.name}</Text>
        <TouchableOpacity onPress={onRemove} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="stop" size={16} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* 역할 칩들 */}
      <View style={styles.rolesWrap}>
        {member.roles.map(role => {
          const rc = ROLE_COLORS[role] ?? { bg: "#F1F5F9", color: "#64748B" };
          return (
            <TouchableOpacity key={role} onPress={() => removeRole(role)} activeOpacity={0.7}
              style={[styles.roleTag, { backgroundColor: rc.bg }]}>
              <Text style={[styles.roleTagText, { color: rc.color }]}>{role}</Text>
              <Text style={[styles.roleTagX, { color: rc.color }]}>×</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity onPress={() => setAddingRole(v => !v)} activeOpacity={0.7}
          style={[styles.addRoleTag, { borderColor: C.border }]}>
          <Text style={[styles.addRoleText, { color: C.textMuted }]}>
            {addingRole ? "닫기" : "+ 역할"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 역할 추가 인라인 */}
      {addingRole && (
        <>
          <View style={[styles.customRoleRow, { borderTopColor: C.border }]}>
            <TextInput
              style={[styles.customRoleInput, { color: C.text, borderColor: C.border }]}
              value={roleInput}
              onChangeText={setRoleInput}
              placeholder="역할 직접 입력"
              placeholderTextColor={C.textMuted}
              maxLength={12}
              onSubmitEditing={() => addRole(roleInput)}
            />
            <TouchableOpacity onPress={() => addRole(roleInput)} activeOpacity={0.7} style={styles.addConfirm}>
              <Icon name="add" size={18} color="#00A9EC" />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.presetRow, { borderTopColor: C.border }]}>
            {ROLE_PRESETS.filter(r => !member.roles.includes(r)).map(r => (
              <TouchableOpacity key={r} onPress={() => addRole(r)} activeOpacity={0.7}
                style={[styles.presetChip, { borderColor: C.border }]}>
                <Text style={[styles.presetText, { color: C.textMuted }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}
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

  colorRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, gap: 12, minHeight: 50 },
  colorPreviewDot: { width: 24, height: 24, borderRadius: 12 },

  statusRow: { flexDirection: "row", gap: 8 },
  statusChip: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  statusLabel: { fontSize: 13, fontWeight: "500" },

  // 팀원 행
  memberBlock: { paddingHorizontal: 14, paddingVertical: 10 },
  memberTopRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 14, fontWeight: "700" },
  memberName: { fontSize: 14, fontWeight: "600", flex: 1 },
  rolesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 2 },
  roleTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  roleTagText: { fontSize: 12, fontWeight: "600" },
  roleTagX: { fontSize: 13, fontWeight: "700", lineHeight: 16 },
  addRoleTag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  addRoleText: { fontSize: 12, fontWeight: "500" },
  customRoleRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 8, marginTop: 6, borderTopWidth: StyleSheet.hairlineWidth },
  customRoleInput: { flex: 1, fontSize: 13, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  selectedRolesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },

  // 팀원 추가
  addMemberBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, borderTopWidth: 1 },
  addMemberText: { fontSize: 14, fontWeight: "500", color: "#00A9EC" },
  addRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderTopWidth: 1 },
  addInput: { flex: 1, fontSize: 14, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  addConfirm: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  presetRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderTopWidth: 1 },
  presetChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  presetText: { fontSize: 12, fontWeight: "500" },
});
