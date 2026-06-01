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
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Polyline } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";
import { useProject } from "@/contexts/ProjectContext";
import { useRouter } from "expo-router";
import MoaLogo from "@/components/common/MoaLogo";
import Icon from "@/components/common/Icon";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDday(dueDateStr: string): { label: string; color: string; bg: string } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr); due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return { label: "D-Day", color: "#fff",     bg: "#00A9EC" };
  if (diff > 0)   return { label: `D-${diff}`,               color: "#16A34A", bg: "#DCFCE7" };
  return                  { label: `D+${Math.abs(diff)}`,    color: "#DC2626", bg: "#FEE2E2" };
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

// ── 캘린더 (점 유지) ──────────────────────
interface CalendarProps {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  todosByDate: Record<string, string[]>;
}

function Calendar({ selectedDate, onSelectDate, todosByDate }: CalendarProps) {
  const C = useTheme();
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const todayStr = toDateKey(new Date());

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
      <View style={calS.navRow}>
        <TouchableOpacity onPress={prevMonth} activeOpacity={0.7} style={calS.navBtn}>
          <ChevronLeftIcon color={C.textSub} />
        </TouchableOpacity>
        <Text style={[calS.monthLabel, { color: C.text }]}>{viewMonth + 1}월</Text>
        <TouchableOpacity onPress={nextMonth} activeOpacity={0.7} style={calS.navBtn}>
          <ChevronRightIcon color={C.textSub} />
        </TouchableOpacity>
      </View>

      <View style={calS.weekRow}>
        {DAY_LABELS.map((d, i) => (
          <Text key={d} style={[calS.dayLabel, {
            color: i === 0 ? "#FF3B30" : i === 6 ? C.primary : C.textMuted,
          }]}>{d}</Text>
        ))}
      </View>

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
  description?: string;
  projectId: string;
  projectName: string;
  done: boolean;
  dueDate: string;
}

// ── 투두 아이템 ───────────────────────────
// isDateMatch: 선택된 날짜와 dueDate가 일치할 때만 펼침 화살표 + D-day 뱃지 표시
function TodoItem({ todo, onToggle, accentColor, isDateMatch }: {
  todo: Todo;
  onToggle: (id: string) => void;
  accentColor: string;
  isDateMatch: boolean;
}) {
  const C = useTheme();
  const [expanded, setExpanded] = useState(false);
  const dday = getDday(todo.dueDate);
  const canExpand = isDateMatch && !!todo.description;

  const toggleExpand = () => {
    if (!canExpand) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(v => !v);
  };

  return (
    <View style={[todoS.wrap, { borderBottomColor: C.border }]}>
      <TouchableOpacity onPress={toggleExpand} activeOpacity={canExpand ? 0.7 : 1} style={todoS.row}>
        {/* 체크박스 */}
        <TouchableOpacity
          onPress={() => onToggle(todo.id)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={[todoS.checkbox, {
            borderColor: todo.done ? accentColor : C.border,
            backgroundColor: todo.done ? accentColor : "transparent",
          }]}
        >
          {todo.done && (
            <Svg width={11} height={11} viewBox="0 0 12 12" fill="none">
              <Polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          )}
        </TouchableOpacity>

        <Text style={[todoS.title, {
          color: todo.done ? C.textMuted : C.text,
          textDecorationLine: todo.done ? "line-through" : "none",
        }]} numberOfLines={1}>{todo.title}</Text>

        <View style={todoS.right}>
          {/* D-day 뱃지: 해당 날짜 투두에만 */}
          {isDateMatch && !todo.done && (
            <View style={[todoS.ddayBadge, { backgroundColor: dday.bg }]}>
              <Text style={[todoS.ddayText, { color: dday.color }]}>{dday.label}</Text>
            </View>
          )}
          {/* 펼침 화살표: 해당 날짜 & 설명 있을 때만 */}
          {canExpand && (
            expanded ? <ChevronUpIcon color={C.textMuted} /> : <ChevronDownIcon color={C.textMuted} />
          )}
        </View>
      </TouchableOpacity>

      {expanded && canExpand && (
        <Text style={[todoS.description, { color: C.textMuted, borderTopColor: C.border }]}>
          {todo.description}
        </Text>
      )}
    </View>
  );
}

const todoS = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: { flex: 1, fontSize: 14, fontWeight: "500" },
  right: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  ddayBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  ddayText: { fontSize: 11, fontWeight: "700" },
  description: {
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 36,
    paddingBottom: 10,
    paddingTop: 4,
    color: "#888",
  },
});

// ── 프로젝트 섹션 ─────────────────────────
function ProjectSection({ projectName, projectColor, pendingTodos, doneTodos, onToggle, selectedDateKey }: {
  projectName: string;
  projectColor: string;
  pendingTodos: Todo[];
  doneTodos: Todo[];
  onToggle: (id: string) => void;
  selectedDateKey: string;
}) {
  const C = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [doneExpanded, setDoneExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed(v => !v);
  };
  const toggleDone = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDoneExpanded(v => !v);
  };

  return (
    <View style={[secS.card, { backgroundColor: C.bgCard }]}>
      <TouchableOpacity activeOpacity={0.7} onPress={toggle} style={secS.header}>
        {/* 컬러 원 도트 */}
        <View style={[secS.dot, { backgroundColor: projectColor }]} />
        <Text style={[secS.projectName, { color: C.text }]} numberOfLines={1}>{projectName}</Text>
        <View style={secS.headerRight}>
          {pendingTodos.length > 0 && (
            <Text style={[secS.countText, { color: C.textMuted }]}>{pendingTodos.length}</Text>
          )}
          {collapsed ? <ChevronDownIcon color={C.textMuted} /> : <ChevronUpIcon color={C.textMuted} />}
        </View>
      </TouchableOpacity>

      {!collapsed && (
        <>
          {pendingTodos.map(t => (
            <TodoItem
              key={t.id}
              todo={t}
              onToggle={onToggle}
              accentColor={projectColor}
              isDateMatch={t.dueDate === selectedDateKey}
            />
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
                <TodoItem
                  key={t.id}
                  todo={t}
                  onToggle={onToggle}
                  accentColor={projectColor}
                  isDateMatch={t.dueDate === selectedDateKey}
                />
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
    // 카드 없음 — 플랫 리스트
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  projectName: { flex: 1, fontSize: 15, fontWeight: "700" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  countText: { fontSize: 13, fontWeight: "500" },
  doneToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    paddingHorizontal: 4,
  },
  doneLabel: { fontSize: 12, fontWeight: "500" },
  empty: { textAlign: "center", fontSize: 13, paddingVertical: 12 },
});

// ── Mock 데이터 ───────────────────────────
const INITIAL_TODOS: Todo[] = [
  { id: "1", title: "API 엔드포인트 설계 문서 작성",  projectId: "1", projectName: "AI 챗봇 개발",     done: false, dueDate: "2026-04-09",
    description: "할 일 설명할 일 설명할 일 설명할 일 설명할 일 설명할 일 설명할 일 설명할 일 설명할 일 설명할 일 설명할 일 설명." },
  { id: "2", title: "스프린트 리뷰 발표 자료 준비",   projectId: "1", projectName: "AI 챗봇 개발",     done: false, dueDate: "2026-04-12" },
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
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedDateKey = toDateKey(selectedDate);

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const todosByDate = useMemo(() => {
    const map: Record<string, string[]> = {};
    todos.forEach(t => {
      if (t.done) return;
      const project = projects.find(p => p.id === t.projectId);
      const color = project ? project.color : C.primary;
      if (!map[t.dueDate]) map[t.dueDate] = [];
      if (!map[t.dueDate].includes(color)) map[t.dueDate].push(color);
    });
    return map;
  }, [todos, projects]);

  const filteredTodos = useMemo(() => {
    if (!searchQuery.trim()) return todos;
    return todos.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [todos, searchQuery]);

  const activeGroups = useMemo(() => projects.map(project => ({
    project,
    pendingTodos: filteredTodos.filter(t => t.projectId === project.id && !t.done),
    doneTodos:    filteredTodos.filter(t => t.projectId === project.id && t.done),
  })).filter(g => g.pendingTodos.length > 0 || g.doneTodos.length > 0), [filteredTodos, projects]);

  const dateLabel = `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <View style={s.headerLeft}>
          <MoaLogo size={32} />
          <Text style={[s.headerTitle, { color: C.text }]}>To-Do</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.7}
            onPress={() => {
              setSearchVisible(v => !v);
              if (searchVisible) setSearchQuery("");
            }}
          >
            <SearchIcon color={searchVisible ? C.primary : C.textSub} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.7}
            onPress={() => router.push("/(screens)/todo/add" as any)}
          >
            <PlusIcon color={C.textSub} />
          </TouchableOpacity>
        </View>
      </View>

      {searchVisible && (
        <View style={[s.searchBar, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
          <SearchIcon color={C.textMuted} />
          <TextInput
            autoFocus
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="할 일 검색"
            placeholderTextColor={C.textMuted}
            style={[s.searchInput, { color: C.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <Icon name="close" size={18} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {!searchVisible && (
          <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} todosByDate={todosByDate} />
        )}

        {!searchVisible && (
          <View style={s.dateLabelRow}>
            <Text style={[s.dateLabel, { color: C.textMuted }]}>모드 · {dateLabel}</Text>
          </View>
        )}

        {activeGroups.length > 0 ? (
          activeGroups.map(({ project, pendingTodos, doneTodos }) => (
            <ProjectSection
              key={project.id}
              projectName={project.name}
              projectColor={project.color}
              pendingTodos={pendingTodos}
              doneTodos={doneTodos}
              onToggle={toggleTodo}
              selectedDateKey={selectedDateKey}
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
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  body: { padding: 16, gap: 12, paddingBottom: 48 },
  dateLabelRow: { paddingHorizontal: 4, marginTop: 2, marginBottom: -2 },
  dateLabel: { fontSize: 12, fontWeight: "500" },
  emptyWrap: { alignItems: "center", paddingVertical: 48, gap: 6 },
  emptyEmoji: { fontSize: 40, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyDesc: { fontSize: 13 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
});
