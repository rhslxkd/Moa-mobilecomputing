import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Polyline } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { useProject } from "@/contexts/ProjectContext";

// ── Chevron 아이콘 ─────────────────────────
function ChevronLeftIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18L9 12L15 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function ChevronRightIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18L15 12L9 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── 달력 컴포넌트 ─────────────────────────
interface CalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  todosByDate: Record<string, number>; // "YYYY-MM-DD" → count
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function Calendar({ selectedDate, onSelectDate, todosByDate }: CalendarProps) {
  const C = useTheme();
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // 6행을 채우도록
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View style={[calStyles.container, { backgroundColor: C.bgCard, borderColor: C.border }]}>
      {/* 월 네비게이션 */}
      <View style={calStyles.navRow}>
        <TouchableOpacity onPress={prevMonth} activeOpacity={0.7} style={calStyles.navBtn}>
          <ChevronLeftIcon color={C.textSub} />
        </TouchableOpacity>
        <Text style={[calStyles.monthLabel, { color: C.text }]}>{viewMonth + 1}월</Text>
        <TouchableOpacity onPress={nextMonth} activeOpacity={0.7} style={calStyles.navBtn}>
          <ChevronRightIcon color={C.textSub} />
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 */}
      <View style={calStyles.weekRow}>
        {DAY_LABELS.map((d, i) => (
          <Text key={d} style={[calStyles.dayLabel, { color: i === 0 ? "#FF3B30" : i === 6 ? C.primary : C.textMuted }]}>
            {d}
          </Text>
        ))}
      </View>

      {/* 날짜 그리드 */}
      {weeks.map((week, wi) => (
        <View key={wi} style={calStyles.weekRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={calStyles.dayCell} />;

            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const isSelected =
              selectedDate.getFullYear() === viewYear &&
              selectedDate.getMonth() === viewMonth &&
              selectedDate.getDate() === day;
            const hasTodo = !!todosByDate[dateStr];
            const isSun = di === 0;
            const isSat = di === 6;

            return (
              <TouchableOpacity
                key={di}
                style={calStyles.dayCell}
                onPress={() => onSelectDate(new Date(viewYear, viewMonth, day))}
                activeOpacity={0.7}
              >
                <View style={[
                  calStyles.dayCircle,
                  isSelected && { backgroundColor: C.primary },
                  isToday && !isSelected && { borderWidth: 1.5, borderColor: C.primary },
                ]}>
                  <Text style={[
                    calStyles.dayText,
                    { color: isSelected ? "#FFFFFF" : isSun ? "#FF3B30" : isSat ? C.primary : C.text },
                  ]}>
                    {day}
                  </Text>
                </View>
                {hasTodo && (
                  <View style={[calStyles.dot, { backgroundColor: isSelected ? "#FFFFFF" : C.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const calStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 4,
  },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 24, marginBottom: 14 },
  navBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: 16, fontWeight: "700", minWidth: 36, textAlign: "center" },
  weekRow: { flexDirection: "row" },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "500", paddingVertical: 6 },
  dayCell: { flex: 1, alignItems: "center", paddingVertical: 4, gap: 2 },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  dayText: { fontSize: 13, fontWeight: "400" },
  dot: { width: 4, height: 4, borderRadius: 2 },
});

// ── 투두 아이템 ───────────────────────────
interface Todo {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  done: boolean;
  dueDate: string;
}

function TodoItem({ todo, onToggle }: { todo: Todo; onToggle: (id: string) => void }) {
  const C = useTheme();
  return (
    <TouchableOpacity
      onPress={() => onToggle(todo.id)}
      activeOpacity={0.7}
      style={[styles.todoItem, { backgroundColor: C.bgCard, borderColor: C.border }]}
    >
      <View style={[
        styles.todoCircle,
        {
          borderColor: todo.done ? C.primary : C.border,
          backgroundColor: todo.done ? C.primary : "transparent",
        },
      ]}>
        {todo.done && (
          <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
            <Polyline points="2,6 5,9 10,3" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
      </View>
      <Text style={[styles.todoTitle, { color: todo.done ? C.textMuted : C.text, textDecorationLine: todo.done ? "line-through" : "none" }]} numberOfLines={1}>
        {todo.title}
      </Text>
    </TouchableOpacity>
  );
}

// ── Mock 데이터 ───────────────────────────
const INITIAL_TODOS: Todo[] = [
  { id: "1", title: "API 엔드포인트 설계 문서 작성", projectId: "1", projectName: "AI 챗봇 개발", done: false, dueDate: "2026-03-31" },
  { id: "2", title: "스프린트 리뷰 발표 자료 준비",  projectId: "1", projectName: "AI 챗봇 개발", done: false, dueDate: "2026-03-31" },
  { id: "3", title: "메인 화면 피그마 컴포넌트 완성", projectId: "2", projectName: "모바일 앱 디자인", done: false, dueDate: "2026-03-20" },
  { id: "4", title: "데이터 전처리 스크립트 검토",   projectId: "3", projectName: "데이터 분석", done: false, dueDate: "2026-03-18" },
  { id: "5", title: "아이콘 에셋 정리",               projectId: "2", projectName: "모바일 앱 디자인", done: true,  dueDate: "2026-03-18" },
];

// ── 메인 화면 ──────────────────────────────
export default function TodosScreen() {
  const C = useTheme();
  const { projects } = useProject();
  const [todos, setTodos] = useState<Todo[]>(INITIAL_TODOS);
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 2, 12)); // 2026-03-12
  const [filterProjectId, setFilterProjectId] = useState<string>("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  // 날짜별 투두 맵 (캘린더 점 표시용)
  const todosByDate: Record<string, number> = {};
  todos.forEach(t => {
    if (!t.done) todosByDate[t.dueDate] = (todosByDate[t.dueDate] || 0) + 1;
  });

  const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
  const todayStr = `오늘 · ${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`;

  const filtered = todos.filter(t => {
    const matchProject = filterProjectId === "all" || t.projectId === filterProjectId;
    return matchProject;
  });

  const pending = filtered.filter(t => !t.done);
  const done = filtered.filter(t => t.done);

  const filterOptions = [
    { id: "all", label: "전체" },
    ...projects.map(p => ({ id: p.id, label: p.name })),
  ];
  const currentFilterLabel = filterOptions.find(f => f.id === filterProjectId)?.label ?? "전체";

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.bg }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>To-Do</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Circle cx={11} cy={11} r={7} stroke={C.textSub} strokeWidth={2} />
              <Path d="M20 20L16.25 16.25" stroke={C.textSub} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M12 6L12 18" stroke={C.textSub} strokeWidth={2} strokeLinecap="square" />
              <Path d="M18 12L6 12" stroke={C.textSub} strokeWidth={2} strokeLinecap="square" />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* 캘린더 */}
        <Calendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          todosByDate={todosByDate}
        />

        {/* 투두 리스트 헤더 */}
        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: C.text }]}>To-Do</Text>
          <TouchableOpacity
            onPress={() => setDropdownOpen(true)}
            style={styles.filterBtn}
            activeOpacity={0.7}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path d="M5 7H19" stroke={C.textSub} strokeLinecap="round" />
              <Path d="M5 12H15" stroke={C.textSub} strokeLinecap="round" />
              <Path d="M5 17H11" stroke={C.textSub} strokeLinecap="round" />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* 날짜 레이블 */}
        <Text style={[styles.dateLabel, { color: C.textMuted }]}>{todayStr}</Text>

        {/* 미완료 */}
        {pending.map(t => (
          <TodoItem key={t.id} todo={t} onToggle={toggleTodo} />
        ))}

        {/* 완료 */}
        {done.length > 0 && (
          <>
            <Text style={[styles.doneLabel, { color: C.textMuted }]}>완료한 일</Text>
            {done.map(t => (
              <TodoItem key={t.id} todo={t} onToggle={toggleTodo} />
            ))}
          </>
        )}

        {filtered.length === 0 && (
          <Text style={[styles.emptyText, { color: C.textMuted }]}>할일이 없어요.</Text>
        )}
      </ScrollView>

      {/* 필터 드롭다운 */}
      <Modal visible={dropdownOpen} transparent animationType="fade" onRequestClose={() => setDropdownOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDropdownOpen(false)}>
          <View style={[styles.dropdown, { backgroundColor: C.bgCard }]}>
            {filterOptions.map(opt => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => { setFilterProjectId(opt.id); setDropdownOpen(false); }}
                style={[styles.dropdownItem, { borderBottomColor: C.border }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownText, { color: opt.id === filterProjectId ? C.primary : C.text }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  headerRight: { flexDirection: "row" },
  iconBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },

  body: { padding: 16, gap: 12, paddingBottom: 40 },

  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  listTitle: { fontSize: 17, fontWeight: "700" },
  filterBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  dateLabel: { fontSize: 12, fontWeight: "500", marginTop: -4 },
  doneLabel: { fontSize: 13, fontWeight: "500", marginTop: 4 },

  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  todoCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  todoTitle: { flex: 1, fontSize: 14 },

  emptyText: { textAlign: "center", fontSize: 14, paddingVertical: 20 },

  // 드롭다운
  modalBackdrop: { flex: 1 },
  dropdown: {
    position: "absolute",
    top: 140,
    right: 16,
    borderRadius: 12,
    minWidth: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  dropdownItem: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  dropdownText: { fontSize: 14, fontWeight: "500" },
});
