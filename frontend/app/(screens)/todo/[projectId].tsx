/**
 * app/(screens)/todo/[projectId].tsx
 * 프로젝트 팀 투두 — 팀원별로 묶어 표시 + 캘린더 필터
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Polyline } from "react-native-svg";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { useProject } from "@/contexts/ProjectContext";
import { TodoAPI } from "@/services/api";
import Icon from "@/components/common/Icon";
import CalendarPicker from "@/components/common/CalendarPicker";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── 상수 & 유틸 ───────────────────────────
const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  팀장:          { bg: "#FFF3CD", color: "#B45309" },
  개발자:        { bg: "#E0F2FE", color: "#0369A1" },
  디자이너:      { bg: "#F3E8FF", color: "#7C3AED" },
  기획자:        { bg: "#DCFCE7", color: "#16A34A" },
  "데이터 분석": { bg: "#FEE2E2", color: "#DC2626" },
  QA:            { bg: "#F1F5F9", color: "#64748B" },
};

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDday(d: Date): { label: string; color: string; bg: string } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(d);  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return { label: "D-Day", color: "#fff",     bg: "#00A9EC" };
  if (diff > 0)   return { label: `D-${diff}`,              color: "#16A34A", bg: "#DCFCE7" };
  return                  { label: `D+${Math.abs(diff)}`,   color: "#DC2626", bg: "#FEE2E2" };
}

interface TodoItem { id: string; title: string; done: boolean; dueDate: Date }

// ── 아이콘 ────────────────────────────────
function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18L9 12L15 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
function ChevronLeft({ color }: { color: string }) {
  return <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M15 18L9 12L15 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
function ChevronRight({ color }: { color: string }) {
  return <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"><Path d="M9 18L15 12L9 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
function ChevronDown({ color }: { color: string }) {
  return <Svg width={15} height={15} viewBox="0 0 24 24" fill="none"><Path d="M6 9L12 15L18 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
function ChevronUp({ color }: { color: string }) {
  return <Svg width={15} height={15} viewBox="0 0 24 24" fill="none"><Path d="M18 15L12 9L6 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

// ── 캘린더 ────────────────────────────────
function Calendar({ selectedDate, onSelectDate, todosByDate, accent }: {
  selectedDate: Date | null;
  onSelectDate: (d: Date | null) => void;
  todosByDate: Record<string, number>;
  accent: string;
}) {
  const C = useTheme();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const todayStr = toDateStr(today);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const prev = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const next = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  return (
    <View style={[calS.card, { backgroundColor: C.bgCard }]}>
      <View style={calS.navRow}>
        <TouchableOpacity onPress={prev} activeOpacity={0.7} style={calS.navBtn}><ChevronLeft color={C.textSub} /></TouchableOpacity>
        <Text style={[calS.monthLabel, { color: C.text }]}>{viewMonth + 1}월</Text>
        <TouchableOpacity onPress={next} activeOpacity={0.7} style={calS.navBtn}><ChevronRight color={C.textSub} /></TouchableOpacity>
      </View>
      <View style={calS.weekRow}>
        {DAY_KO.map((d, i) => (
          <Text key={d} style={[calS.dayLabel, { color: i === 0 ? "#FF3B30" : i === 6 ? accent : C.textMuted }]}>{d}</Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={calS.weekRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={calS.dayCell} />;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const isSelected = selectedDate
              ? selectedDate.getFullYear() === viewYear && selectedDate.getMonth() === viewMonth && selectedDate.getDate() === day
              : false;
            const count = todosByDate[dateStr] ?? 0;
            const isSun = di === 0, isSat = di === 6;
            return (
              <TouchableOpacity
                key={di}
                style={calS.dayCell}
                onPress={() => isSelected ? onSelectDate(null) : onSelectDate(new Date(viewYear, viewMonth, day))}
                activeOpacity={0.7}
              >
                <View style={[calS.dayCircle, isSelected && { backgroundColor: accent }, isToday && !isSelected && { borderWidth: 1.5, borderColor: accent }]}>
                  <Text style={[calS.dayText, { color: isSelected ? "#fff" : isSun ? "#FF3B30" : isSat ? accent : C.text, fontWeight: isToday ? "700" : "400" }]}>{day}</Text>
                </View>
                {count > 0 && (
                  <View style={calS.dotRow}>
                    {Array.from({ length: Math.min(count, 3) }).map((_, pi) => (
                      <View key={pi} style={[calS.dot, { backgroundColor: accent }]} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const calS = StyleSheet.create({
  card: { borderRadius: 20, padding: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 28, marginBottom: 16 },
  navBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: 17, fontWeight: "700", minWidth: 36, textAlign: "center" },
  weekRow: { flexDirection: "row" },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600", paddingVertical: 6, letterSpacing: 0.3 },
  dayCell: { flex: 1, alignItems: "center", paddingVertical: 4, gap: 3 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dayText: { fontSize: 13 },
  dotRow: { flexDirection: "row", gap: 2, height: 5, alignItems: "center" },
  dot: { width: 4, height: 4, borderRadius: 2 },
});

// ── 투두 행 ───────────────────────────────
function TodoRow({ todo, onToggle, onLongPress, accent }: { todo: TodoItem; onToggle: (id: string) => void; onLongPress?: (id: string) => void; accent: string }) {
  const C = useTheme();
  const dday = getDday(todo.dueDate);
  return (
    <TouchableOpacity onPress={() => onToggle(todo.id)} onLongPress={() => onLongPress?.(todo.id)} activeOpacity={0.7} style={[rowS.row, { borderBottomColor: C.border }]}>
      <View style={[rowS.checkbox, { borderColor: todo.done ? accent : C.border, backgroundColor: todo.done ? accent : "transparent" }]}>
        {todo.done && (
          <Svg width={11} height={11} viewBox="0 0 12 12" fill="none">
            <Polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
      </View>
      <Text style={[rowS.title, { color: todo.done ? C.textMuted : C.text, textDecorationLine: todo.done ? "line-through" : "none" }]} numberOfLines={1}>{todo.title}</Text>
      {!todo.done && (
        <View style={[rowS.badge, { backgroundColor: dday.bg }]}>
          <Text style={[rowS.badgeText, { color: dday.color }]}>{dday.label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const rowS = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { flex: 1, fontSize: 14, fontWeight: "500" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, flexShrink: 0 },
  badgeText: { fontSize: 11, fontWeight: "700" },
});

// ── 멤버 섹션 ─────────────────────────────
function MemberSection({ member, todos, accent, onToggle, onLongPress }: {
  member: { id: string; name: string; roles: string[] };
  todos: TodoItem[];
  accent: string;
  onToggle: (id: string) => void;
  onLongPress?: (id: string) => void;
}) {
  const C = useTheme();
  const [expanded, setExpanded] = useState(true);
  const [doneOpen, setDoneOpen] = useState(false);

  if (todos.length === 0) return null;

  const pending = todos.filter(t => !t.done);
  const done = todos.filter(t => t.done);

  const toggle = () => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpanded(v => !v); };
  const toggleDone = () => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setDoneOpen(v => !v); };

  return (
    <View style={[memS.card, { backgroundColor: C.bgCard }]}>
      {/* 멤버 헤더 */}
      <TouchableOpacity activeOpacity={0.7} onPress={toggle} style={memS.header}>
        {/* 아바타 */}
        <View style={[memS.avatar, { backgroundColor: accent + "20" }]}>
          <Text style={[memS.avatarText, { color: accent }]}>{member.name.charAt(0)}</Text>
        </View>
        {/* 이름 + 역할 */}
        <View style={memS.nameWrap}>
          <Text style={[memS.name, { color: C.text }]}>{member.name}</Text>
          <View style={memS.rolesRow}>
            {member.roles.map(role => {
              const rs = ROLE_STYLE[role] ?? { bg: "#F1F5F9", color: "#64748B" };
              return (
                <View key={role} style={[memS.rolePill, { backgroundColor: rs.bg }]}>
                  <Text style={[memS.roleText, { color: rs.color }]}>{role}</Text>
                </View>
              );
            })}
          </View>
        </View>
        {/* 미완료 뱃지 */}
        {pending.length > 0 && (
          <View style={[memS.countBadge, { backgroundColor: accent }]}>
            <Text style={memS.countText}>{pending.length}</Text>
          </View>
        )}
        {expanded ? <ChevronUp color={C.textMuted} /> : <ChevronDown color={C.textMuted} />}
      </TouchableOpacity>

      {/* 투두 목록 */}
      {expanded && (
        <>
          {pending.map(t => <TodoRow key={t.id} todo={t} onToggle={onToggle} onLongPress={onLongPress} accent={accent} />)}

          {done.length > 0 && (
            <>
              <TouchableOpacity onPress={toggleDone} activeOpacity={0.7} style={[memS.doneToggle, { borderTopColor: C.border }]}>
                <Text style={[memS.doneLabel, { color: C.textMuted }]}>완료 {done.length}개</Text>
                {doneOpen ? <ChevronUp color={C.textMuted} /> : <ChevronDown color={C.textMuted} />}
              </TouchableOpacity>
              {doneOpen && done.map(t => <TodoRow key={t.id} todo={t} onToggle={onToggle} onLongPress={onLongPress} accent={accent} />)}
            </>
          )}

          {pending.length === 0 && done.length === 0 && (
            <Text style={[memS.empty, { color: C.textMuted }]}>할 일이 없어요.</Text>
          )}
        </>
      )}
    </View>
  );
}

const memS = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 16, fontWeight: "800" },
  nameWrap: { flex: 1, flexDirection: "column", alignItems: "flex-start", gap: 4 },
  name: { fontSize: 15, fontWeight: "700" },
  rolesRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  rolePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  roleText: { fontSize: 11, fontWeight: "600" },
  countBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  countText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  doneToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth },
  doneLabel: { fontSize: 12, fontWeight: "500" },
  empty: { textAlign: "center", fontSize: 13, paddingVertical: 18 },
});

// ── 메인 화면 ──────────────────────────────
export default function ProjectTodosScreen() {
  const C = useTheme();
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { projects } = useProject();

  const project = projects.find(p => p.id === projectId);
  const accent = project ? project.color : C.primary;

  const [todoMap, setTodoMap] = useState<Record<string, TodoItem[]>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // 수정 모달 상태
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAssignee, setEditAssignee] = useState<string | null>(null);
  const [editDue, setEditDue] = useState<Date>(new Date());
  const [showEditCal, setShowEditCal] = useState(false);

  const load = useCallback(() => {
    if (!projectId) return;
    TodoAPI.listByProject(projectId).then(dtos => {
      const map: Record<string, TodoItem[]> = {};
      dtos.forEach(d => {
        const key = d.assignee_member_id ?? "__unassigned__";
        if (!map[key]) map[key] = [];
        map[key].push({
          id: d.id,
          title: d.title,
          done: d.done,
          dueDate: d.due_date ? new Date(d.due_date) : new Date(),
        });
      });
      setTodoMap(map);
    }).catch(() => {});
  }, [projectId]);

  useFocusEffect(load);

  const openEdit = (memberId: string, todoId: string) => {
    const todo = (todoMap[memberId] ?? []).find(t => t.id === todoId);
    if (!todo) return;
    setEditId(todoId);
    setEditTitle(todo.title);
    setEditAssignee(memberId === "__unassigned__" ? null : memberId);
    setEditDue(todo.dueDate);
    setShowEditCal(false);
  };

  const toYmd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fmtDueLabel = (d: Date) => {
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
  };

  const handleEditSave = async () => {
    if (!editId || !editTitle.trim()) return;
    const id = editId;
    setEditId(null);
    await TodoAPI.update(id, {
      title: editTitle.trim(),
      assignee_member_id: editAssignee ?? "",
      due_date: toYmd(editDue),
    }).catch(() => {});
    load();
  };

  const handleEditDelete = async () => {
    if (!editId) return;
    const id = editId;
    setEditId(null);
    await TodoAPI.delete(id).catch(() => {});
    load();
  };

  const toggleTodo = async (memberId: string, todoId: string) => {
    setTodoMap(prev => ({
      ...prev,
      [memberId]: (prev[memberId] ?? []).map(t => t.id === todoId ? { ...t, done: !t.done } : t),
    }));
    await TodoAPI.toggleDone(todoId).catch(() => {});
  };

  const allTodos = useMemo(() => Object.values(todoMap).flat(), [todoMap]);

  // 캘린더 점용 날짜 맵
  const todosByDate = useMemo(() => {
    const map: Record<string, number> = {};
    allTodos.forEach(t => { if (!t.done) { const k = toDateStr(t.dueDate); map[k] = (map[k] ?? 0) + 1; } });
    return map;
  }, [allTodos]);

  // 날짜 필터
  const filteredMap = useMemo(() => {
    if (!selectedDate) return todoMap;
    const sel = toDateStr(selectedDate);
    return Object.fromEntries(
      Object.entries(todoMap).map(([id, todos]) => [id, todos.filter(t => toDateStr(t.dueDate) === sel)])
    );
  }, [todoMap, selectedDate]);

  const totalPending = useMemo(() => Object.values(filteredMap).flat().filter(t => !t.done).length, [filteredMap]);
  const hasAny = useMemo(() => Object.values(filteredMap).some(ts => ts.length > 0), [filteredMap]);

  const dateLabelStr = selectedDate
    ? `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일 (${DAY_KO[selectedDate.getDay()]})`
    : "전체";

  if (!project) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: C.textMuted }}>프로젝트를 찾을 수 없어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      {/* 헤더 */}
      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.iconBtn}>
          <BackIcon color={C.text} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          {/* 프로젝트 색상 아이콘 */}
          <View style={[s.projectIcon, { backgroundColor: accent + "20" }]}>
            <Text style={s.projectEmoji}>{project.emoji}</Text>
          </View>
          <View>
            <Text style={[s.headerTitle, { color: C.text }]} numberOfLines={1}>{project.name}</Text>
            <Text style={[s.headerSub, { color: C.textMuted }]}>팀원 {project.memberCount}명 · 미완료 {totalPending}개</Text>
          </View>
        </View>

        <TouchableOpacity
          style={s.iconBtn}
          activeOpacity={0.7}
          onPress={() => router.push("/(screens)/todo/add" as any)}
        >
          <PlusIcon color={C.textSub} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* 캘린더 */}
        <Calendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          todosByDate={todosByDate}
          accent={accent}
        />

        {/* 날짜 필터 표시 */}
        <View style={s.filterRow}>
          <Text style={[s.filterLabel, { color: C.text }]}>{dateLabelStr}</Text>
          <View style={s.filterRight}>
            {totalPending > 0 && (
              <View style={[s.totalBadge, { backgroundColor: accent + "18" }]}>
                <Text style={[s.totalBadgeText, { color: accent }]}>{totalPending}개 남음</Text>
              </View>
            )}
            {selectedDate && (
              <TouchableOpacity onPress={() => setSelectedDate(null)} activeOpacity={0.7} style={[s.clearBtn, { borderColor: C.border }]}>
                <Text style={[s.clearText, { color: C.textMuted }]}>전체 보기</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 멤버별 섹션 */}
        {hasAny ? (
          <>
            {project.members.map(member => (
              <MemberSection
                key={member.id}
                member={member}
                todos={filteredMap[member.id] ?? []}
                accent={accent}
                onToggle={(todoId) => toggleTodo(member.id, todoId)}
                onLongPress={(todoId) => openEdit(member.id, todoId)}
              />
            ))}
            {(filteredMap["__unassigned__"] ?? []).length > 0 && (
              <MemberSection
                key="__unassigned__"
                member={{ id: "__unassigned__", name: "미배정", roles: [] }}
                todos={filteredMap["__unassigned__"]}
                accent={accent}
                onToggle={(todoId) => toggleTodo("__unassigned__", todoId)}
                onLongPress={(todoId) => openEdit("__unassigned__", todoId)}
              />
            )}
          </>
        ) : (
          <View style={s.emptyWrap}>
            <Text style={s.emptyEmoji}>🎉</Text>
            <Text style={[s.emptyTitle, { color: C.text }]}>
              {selectedDate ? "이 날은 할 일이 없어요!" : "모든 할 일을 완료했어요!"}
            </Text>
            <Text style={[s.emptyDesc, { color: C.textMuted }]}>새로운 할 일을 추가해보세요</Text>
          </View>
        )}
      </ScrollView>

      {/* 수정 모달 */}
      <Modal visible={!!editId} transparent animationType="fade" onRequestClose={() => setEditId(null)}>
        <TouchableOpacity style={em.overlay} activeOpacity={1} onPress={() => setEditId(null)}>
          <TouchableOpacity activeOpacity={1} style={[em.sheet, { backgroundColor: C.bgCard }]}>
            <Text style={[em.title, { color: C.text }]}>할 일 수정</Text>
            <TextInput
              style={[em.input, { color: C.text, borderColor: C.border, backgroundColor: C.bg }]}
              value={editTitle}
              onChangeText={setEditTitle}
              autoFocus
            />

            {/* 담당자 */}
            <Text style={[em.label, { color: C.textMuted }]}>담당자</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setEditAssignee(null)}
                style={[em.chip, { borderColor: C.border }, !editAssignee && { backgroundColor: accent, borderColor: accent }]}
              >
                <Text style={[em.chipText, { color: !editAssignee ? "#fff" : C.textMuted }]}>미배정</Text>
              </TouchableOpacity>
              {(project?.members ?? []).map((m) => {
                const active = editAssignee === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    activeOpacity={0.7}
                    onPress={() => setEditAssignee(m.id)}
                    style={[em.chip, { borderColor: C.border }, active && { backgroundColor: accent, borderColor: accent }]}
                  >
                    <Text style={[em.chipText, { color: active ? "#fff" : C.text }]}>
                      {m.name}{m.roles?.length ? ` · ${m.roles[0]}` : ""}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 마감일 */}
            <Text style={[em.label, { color: C.textMuted }]}>마감일</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowEditCal(v => !v)}
              style={[em.dueRow, { borderColor: showEditCal ? accent : C.border, backgroundColor: C.bg }]}
            >
              <Icon name="calendar" size={16} color={showEditCal ? accent : C.textMuted} />
              <Text style={[em.dueText, { color: showEditCal ? accent : C.text }]}>{fmtDueLabel(editDue)}</Text>
            </TouchableOpacity>
            {showEditCal && (
              <View style={[em.calWrap, { borderColor: C.border }]}>
                <CalendarPicker selected={editDue} onSelect={(d) => { setEditDue(d); setShowEditCal(false); }} />
              </View>
            )}

            <TouchableOpacity style={[em.saveBtn, { backgroundColor: accent }]} onPress={handleEditSave} activeOpacity={0.85}>
              <Text style={em.saveText}>저장</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[em.delBtn, { borderColor: C.border }]} onPress={handleEditDelete} activeOpacity={0.85}>
              <Text style={[em.delText, { color: "#DC2626" }]}>삭제</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const em = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", paddingHorizontal: 24 },
  sheet: { borderRadius: 18, padding: 20 },
  title: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "600" },
  dueRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  dueText: { fontSize: 14, fontWeight: "500" },
  calWrap: { borderWidth: 1, borderRadius: 12, padding: 8, marginBottom: 12 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 8 },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  delBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1 },
  delText: { fontSize: 15, fontWeight: "600" },
});

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  iconBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  projectIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  projectEmoji: { fontSize: 20 },
  headerTitle: { fontSize: 15, fontWeight: "800" },
  headerSub: { fontSize: 11, marginTop: 1 },

  body: { padding: 16, gap: 14, paddingBottom: 48 },

  filterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2, marginBottom: -2 },
  filterLabel: { fontSize: 16, fontWeight: "700" },
  filterRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  totalBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  totalBadgeText: { fontSize: 12, fontWeight: "600" },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  clearText: { fontSize: 12, fontWeight: "500" },

  emptyWrap: { alignItems: "center", paddingVertical: 48, gap: 6 },
  emptyEmoji: { fontSize: 40, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyDesc: { fontSize: 13 },
});
