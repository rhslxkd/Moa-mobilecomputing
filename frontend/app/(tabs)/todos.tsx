import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Polyline } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { useProject } from "@/contexts/ProjectContext";
import { useRouter } from "expo-router";
import MoaLogo from "@/components/common/MoaLogo";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── 상수 ──────────────────────────────────
const PROJECT_COLORS: Record<string, string> = {
  blue:   "#00A9EC",
  purple: "#7C3AED",
  green:  "#16A34A",
};
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// ── 유틸 ──────────────────────────────────
function getDday(dueDateStr: string): { label: string; color: string; bg: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return { label: "D-Day", color: "#fff", bg: "#00A9EC" };
  if (diff > 0)   return { label: `D-${diff}`,        color: "#16A34A", bg: "#DCFCE7" };
  return            { label: `D+${Math.abs(diff)}`,   color: "#DC2626", bg: "#FEE2E2" };
}

// ── 아이콘 ────────────────────────────────
function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={2} />
      <Path d="M20 20L16.25 16.25" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
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
function ChevronDownIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9L12 15L18 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function ChevronUpIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
      <Path d="M18 15L12 9L6 15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── 캘린더 ────────────────────────────────
interface CalendarProps {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  todosByDate: Record<string, string[]>;
}

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
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View style={[calS.card, { backgroundColor: C.bgCard }]}>
      {/* 월 네비게이션 */}
      <View style={calS.navRow}>
        <TouchableOpacity onPress={prevMonth} activeOpacity={0.7} style={calS.navBtn}>
          <ChevronLeftIcon color={C.textSub} />
        </TouchableOpacity>
        <Text style={[calS.monthLabel, { color: C.text }]}>{viewMonth + 1}월</Text>
        <TouchableOpacity onPress={nextMonth} activeOpacity={0.7} style={calS.navBtn}>
          <ChevronRightIcon color={C.textSub} />
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 */}
      <View style={calS.weekRow}>
        {DAY_LABELS.map((d, i) => (
          <Text key={d} style={[calS.dayLabel, {
            color: i === 0 ? "#FF3B30" : i === 6 ? C.primary : C.textMuted,
          }]}>{d}</Text>
        ))}
      </View>

      {/* 날짜 그리드 */}
      {weeks.map((week, wi) => (
        <View key={wi} style={calS.weekRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={calS.dayCell} />;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = dateStr === todayStr;
            const isSelected =
              selectedDate.getFullYear() === viewYear &&
              selectedDate.getMonth() === viewMonth &&
              selectedDate.getDate() === day;
            const dotColors = todosByDate[dateStr] ?? [];
            const isSun = di === 0;
            const isSat = di === 6;

            return (
              <TouchableOpacity
                key={di}
                style={calS.dayCell}
                onPress={() => onSelectDate(new Date(viewYear, viewMonth, day))}
                activeOpacity={0.7}
              >
                <View style={[
                  calS.dayCircle,
                  isSelected && { backgroundColor: C.primary },
                  isToday && !isSelected && { borderWidth: 1.5, borderColor: C.primary },
                ]}>
                  <Text style={[calS.dayText, {
                    color: isSelected ? "#fff" : isSun ? "#FF3B30" : isSat ? C.primary : C.text,
                    fontWeight: isToday ? "700" : "400",
                  }]}>{day}</Text>
                </View>
                {dotColors.length > 0 && (
                  <View style={calS.dotRow}>
                    {dotColors.slice(0, 3).map((color, pi) => (
                      <View key={pi} style={[calS.dot, { backgroundColor: color }]} />
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
  card: {
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
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

// ── 투두 타입 ──────────────────────────────
interface Todo {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  done: boolean;
  dueDate: string;
}

// ── 투두 아이템 ───────────────────────────
function TodoItem({ todo, onToggle, accentColor }: {
  todo: Todo;
  onToggle: (id: string) => void;
  accentColor: string;
}) {
  const C = useTheme();
  const dday = getDday(todo.dueDate);

  return (
    <TouchableOpacity
      onPress={() => onToggle(todo.id)}
      activeOpacity={0.7}
      style={[todoS.row, { borderBottomColor: C.border }]}
    >
      {/* 체크박스 */}
      <View style={[todoS.checkbox, {
        borderColor: todo.done ? accentColor : C.border,
        backgroundColor: todo.done ? accentColor : "transparent",
      }]}>
        {todo.done && (
          <Svg width={11} height={11} viewBox="0 0 12 12" fill="none">
            <Polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
      </View>

      {/* 제목 */}
      <Text style={[todoS.title, {
        color: todo.done ? C.textMuted : C.text,
        textDecorationLine: todo.done ? "line-through" : "none",
      }]} numberOfLines={1}>{todo.title}</Text>

      {/* D-day 뱃지 */}
      {!todo.done && (
        <View style={[todoS.ddayBadge, { backgroundColor: dday.bg }]}>
          <Text style={[todoS.ddayText, { color: dday.color }]}>{dday.label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const todoS = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: { flex: 1, fontSize: 14, fontWeight: "500" },
  ddayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  ddayText: { fontSize: 11, fontWeight: "700" },
});

// ── 프로젝트 섹션 ─────────────────────────
interface ProjectSectionProps {
  projectId: string;
  projectName: string;
  projectEmoji: string;
  projectColor: string;
  pendingTodos: Todo[];
  doneTodos: Todo[];
  onToggle: (id: string) => void;
}

function ProjectSection({ projectName, projectEmoji, projectColor, pendingTodos, doneTodos, onToggle }: ProjectSectionProps) {
  const C = useTheme();
  const [expanded, setExpanded] = useState(true);
  const [doneExpanded, setDoneExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(v => !v);
  };
  const toggleDone = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDoneExpanded(v => !v);
  };

  return (
    <View style={[secS.card, { backgroundColor: C.bgCard, borderLeftColor: projectColor }]}>
      {/* 섹션 헤더 */}
      <TouchableOpacity activeOpacity={0.7} onPress={toggle} style={secS.header}>
        <View style={[secS.emojiWrap, { backgroundColor: projectColor + "18" }]}>
          <Text style={secS.emoji}>{projectEmoji}</Text>
        </View>
        <Text style={[secS.projectName, { color: C.text }]} numberOfLines={1}>{projectName}</Text>
        <View style={secS.headerRight}>
          {pendingTodos.length > 0 && (
            <View style={[secS.badge, { backgroundColor: projectColor }]}>
              <Text style={secS.badgeText}>{pendingTodos.length}</Text>
            </View>
          )}
          {expanded ? <ChevronUpIcon color={C.textMuted} /> : <ChevronDownIcon color={C.textMuted} />}
        </View>
      </TouchableOpacity>

      {/* 투두 목록 */}
      {expanded && (
        <>
          {pendingTodos.map(t => (
            <TodoItem key={t.id} todo={t} onToggle={onToggle} accentColor={projectColor} />
          ))}

          {doneTodos.length > 0 && (
            <>
              <TouchableOpacity
                onPress={toggleDone}
                activeOpacity={0.7}
                style={[secS.doneToggle, { borderTopColor: C.border }]}
              >
                <Text style={[secS.doneLabel, { color: C.textMuted }]}>완료 {doneTodos.length}개</Text>
                {doneExpanded ? <ChevronUpIcon color={C.textMuted} /> : <ChevronDownIcon color={C.textMuted} />}
              </TouchableOpacity>
              {doneExpanded && doneTodos.map(t => (
                <TodoItem key={t.id} todo={t} onToggle={onToggle} accentColor={projectColor} />
              ))}
            </>
          )}

          {pendingTodos.length === 0 && doneTodos.length === 0 && (
            <Text style={[secS.empty, { color: C.textMuted }]}>할 일이 없어요 🎉</Text>
          )}
        </>
      )}
    </View>
  );
}

const secS = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  emojiWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 17 },
  projectName: { flex: 1, fontSize: 15, fontWeight: "700" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  doneToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneLabel: { fontSize: 12, fontWeight: "500" },
  empty: { textAlign: "center", fontSize: 13, paddingVertical: 18 },
});

// ── Mock 데이터 ───────────────────────────
const INITIAL_TODOS: Todo[] = [
  { id: "1", title: "API 엔드포인트 설계 문서 작성",  projectId: "1", projectName: "AI 챗봇 개발",     done: false, dueDate: "2026-04-09" },
  { id: "2", title: "스프린트 리뷰 발표 자료 준비",   projectId: "1", projectName: "AI 챗봇 개발",     done: false, dueDate: "2026-04-09" },
  { id: "3", title: "메인 화면 피그마 컴포넌트 완성", projectId: "2", projectName: "모바일 앱 디자인", done: false, dueDate: "2026-04-10" },
  { id: "4", title: "데이터 전처리 스크립트 검토",    projectId: "3", projectName: "데이터 분석",      done: false, dueDate: "2026-04-11" },
  { id: "5", title: "아이콘 에셋 정리",               projectId: "2", projectName: "모바일 앱 디자인", done: true,  dueDate: "2026-04-08" },
  { id: "6", title: "모델 성능 평가 보고서 작성",     projectId: "1", projectName: "AI 챗봇 개발",     done: true,  dueDate: "2026-04-07" },
];

// ── 메인 화면 ──────────────────────────────
export default function TodosScreen() {
  const C = useTheme();
  const router = useRouter();
  const { projects } = useProject();
  const [todos, setTodos] = useState<Todo[]>(INITIAL_TODOS);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  // 날짜별 프로젝트 색상 배열
  const todosByDate = useMemo(() => {
    const map: Record<string, string[]> = {};
    todos.forEach(t => {
      if (t.done) return;
      const project = projects.find(p => p.id === t.projectId);
      const color = project ? (PROJECT_COLORS[project.color] ?? C.primary) : C.primary;
      if (!map[t.dueDate]) map[t.dueDate] = [];
      if (!map[t.dueDate].includes(color)) map[t.dueDate].push(color);
    });
    return map;
  }, [todos, projects]);

  // 프로젝트별 그룹핑
  const activeGroups = useMemo(() => projects.map(project => ({
    project,
    pendingTodos: todos.filter(t => t.projectId === project.id && !t.done),
    doneTodos:    todos.filter(t => t.projectId === project.id && t.done),
  })).filter(g => g.pendingTodos.length > 0 || g.doneTodos.length > 0), [todos, projects]);

  const totalPending = todos.filter(t => !t.done).length;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      {/* 헤더 */}
      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <View style={s.headerLeft}>
          <MoaLogo size={32} />
          <View>
            <Text style={[s.headerTitle, { color: C.text }]}>To-Do</Text>
            {totalPending > 0 && (
              <Text style={[s.headerSub, { color: C.textMuted }]}>미완료 {totalPending}개</Text>
            )}
          </View>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
            <SearchIcon color={C.textSub} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: C.primary }]}
            activeOpacity={0.8}
            onPress={() => router.push("/(screens)/todo/add" as any)}
          >
            <PlusIcon color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* 캘린더 */}
        <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} todosByDate={todosByDate} />

        {/* 섹션 타이틀 */}
        <View style={s.sectionTitleRow}>
          <Text style={[s.sectionTitle, { color: C.text }]}>프로젝트 할 일</Text>
          <View style={[s.totalBadge, { backgroundColor: C.primary + "18" }]}>
            <Text style={[s.totalBadgeText, { color: C.primary }]}>{totalPending}개 남음</Text>
          </View>
        </View>

        {/* 프로젝트별 섹션 */}
        {activeGroups.length > 0 ? (
          activeGroups.map(({ project, pendingTodos, doneTodos }) => (
            <ProjectSection
              key={project.id}
              projectId={project.id}
              projectName={project.name}
              projectEmoji={project.emoji}
              projectColor={PROJECT_COLORS[project.color] ?? C.primary}
              pendingTodos={pendingTodos}
              doneTodos={doneTodos}
              onToggle={toggleTodo}
            />
          ))
        ) : (
          <View style={s.emptyWrap}>
            <Text style={s.emptyEmoji}>🎉</Text>
            <Text style={[s.emptyTitle, { color: C.text }]}>모든 할 일을 완료했어요!</Text>
            <Text style={[s.emptyDesc, { color: C.textMuted }]}>새로운 할 일을 추가해보세요</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 18, fontWeight: "800" },
  headerSub: { fontSize: 11, fontWeight: "500", marginTop: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  body: { padding: 16, gap: 14, paddingBottom: 48 },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: -2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  totalBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  totalBadgeText: { fontSize: 12, fontWeight: "600" },

  emptyWrap: { alignItems: "center", paddingVertical: 48, gap: 6 },
  emptyEmoji: { fontSize: 40, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyDesc: { fontSize: 13 },
});
