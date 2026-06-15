/**
 * app/(screens)/todo/add.tsx
 * 새로운 To-Do 추가 화면
 * 개인 To-Do / 프로젝트 To-Do 탭 전환
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Circle, Polyline } from "react-native-svg";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { useProject } from "@/contexts/ProjectContext";
import { TodoAPI } from "@/services/api";

// ── 상수 ──────────────────────────────────
const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
const PICKER_ITEM_H = 44;
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const AMPM = ["오전", "오후"];

// ── 아이콘 ────────────────────────────────
function BackIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18L9 12L15 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
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
      <Path d="M12 6L12 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M18 12L6 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
function NoteIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M9 5a2 2 0 002 2h2a2 2 0 002-2 2 2 0 00-2-2h-2a2 2 0 00-2 2z" stroke={color} strokeWidth={1.8} />
      <Path d="M9 12h6M9 16h4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
function ChevronDownIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9L12 15L18 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Polyline points="4,12 9,17 20,7" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── 날짜 유틸 ─────────────────────────────
function formatDate(d: Date): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dow = DAY_KO[d.getDay()];
  return `${m}월 ${day}일 (${dow})`;
}
function formatTime(ampm: number, h: number, m: number): string {
  const label = ampm === 0 ? "오전" : "오후";
  return `${label} ${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ── 드럼롤 스크롤 피커 ────────────────────
interface ScrollPickerProps {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  width?: number;
}

function ScrollPicker({ items, selectedIndex, onChange, width = 60 }: ScrollPickerProps) {
  const C = useTheme();
  const ref = useRef<ScrollView>(null);
  const isScrolling = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      ref.current?.scrollTo({ y: selectedIndex * PICKER_ITEM_H, animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.y / PICKER_ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, index));
      onChange(clamped);
      isScrolling.current = false;
    },
    [items.length, onChange]
  );

  return (
    <View style={{ width, height: PICKER_ITEM_H * 3, overflow: "hidden" }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={PICKER_ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        contentContainerStyle={{ paddingVertical: PICKER_ITEM_H }}
      >
        {items.map((item, i) => {
          const isSelected = i === selectedIndex;
          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.7}
              style={[pickerStyles.item, { height: PICKER_ITEM_H }]}
              onPress={() => {
                onChange(i);
                ref.current?.scrollTo({ y: i * PICKER_ITEM_H, animated: true });
              }}
            >
              <Text
                style={[
                  pickerStyles.itemText,
                  {
                    color: isSelected ? C.text : C.textMuted,
                    fontSize: isSelected ? 20 : 15,
                    fontWeight: isSelected ? "700" : "400",
                  },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  item: { alignItems: "center", justifyContent: "center" },
  itemText: {},
});

// ── 인라인 시간 피커 ──────────────────────
interface TimeState {
  ampm: number; // 0=오전, 1=오후
  hour: number; // 0-11 (표시는 1-12)
  minute: number; // 0-59
}

interface InlineTimePickerProps {
  value: TimeState;
  onChange: (v: TimeState) => void;
}

function InlineTimePicker({ value, onChange }: InlineTimePickerProps) {
  const C = useTheme();
  return (
    <View style={[timeStyles.container, { borderColor: C.border }]}>
      {/* 오전/오후 */}
      <ScrollPicker
        items={AMPM}
        selectedIndex={value.ampm}
        onChange={(i) => onChange({ ...value, ampm: i })}
        width={52}
      />
      {/* 시 */}
      <ScrollPicker
        items={HOURS}
        selectedIndex={value.hour}
        onChange={(i) => onChange({ ...value, hour: i })}
        width={52}
      />
      {/* 콜론 */}
      <Text style={[timeStyles.colon, { color: C.text }]}>:</Text>
      {/* 분 */}
      <ScrollPicker
        items={MINUTES}
        selectedIndex={value.minute}
        onChange={(i) => onChange({ ...value, minute: i })}
        width={52}
      />
    </View>
  );
}

const timeStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  colon: { fontSize: 20, fontWeight: "700", marginBottom: 2 },
});

// ── 인라인 캘린더 ─────────────────────────
const CAL_DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

interface InlineCalendarProps {
  selected: Date;
  onSelect: (d: Date) => void;
}

function InlineCalendar({ selected, onSelect }: InlineCalendarProps) {
  const C = useTheme();
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const today = new Date();

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  return (
    <View style={[calStyles.wrap, { borderTopColor: C.border }]}>
      {/* 월 네비게이션 */}
      <View style={calStyles.navRow}>
        <TouchableOpacity onPress={prevMonth} activeOpacity={0.7} style={calStyles.navBtn}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18L9 12L15 6" stroke={C.textSub} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={[calStyles.monthLabel, { color: C.text }]}>
          {viewYear}년 {viewMonth + 1}월
        </Text>
        <TouchableOpacity onPress={nextMonth} activeOpacity={0.7} style={calStyles.navBtn}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M9 18L15 12L9 6" stroke={C.textSub} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 */}
      <View style={calStyles.weekRow}>
        {CAL_DAY_LABELS.map((d, i) => (
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
            const d = new Date(viewYear, viewMonth, day);
            const isSelected =
              selected.getFullYear() === viewYear &&
              selected.getMonth() === viewMonth &&
              selected.getDate() === day;
            const isToday =
              today.getFullYear() === viewYear &&
              today.getMonth() === viewMonth &&
              today.getDate() === day;
            const isSun = di === 0;
            const isSat = di === 6;
            return (
              <TouchableOpacity
                key={di}
                style={calStyles.dayCell}
                onPress={() => onSelect(d)}
                activeOpacity={0.7}
              >
                <View style={[
                  calStyles.dayCircle,
                  isSelected && { backgroundColor: C.primary },
                  isToday && !isSelected && { borderWidth: 1.5, borderColor: C.primary },
                ]}>
                  <Text style={[
                    calStyles.dayText,
                    { color: isSelected ? "#fff" : isSun ? "#FF3B30" : isSat ? C.primary : C.text },
                  ]}>
                    {day}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const calStyles = StyleSheet.create({
  wrap: { borderTopWidth: 1, paddingTop: 12, paddingBottom: 4 },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 10 },
  navBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: 14, fontWeight: "600", minWidth: 80, textAlign: "center" },
  weekRow: { flexDirection: "row" },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "500", paddingVertical: 4 },
  dayCell: { flex: 1, alignItems: "center", paddingVertical: 3 },
  dayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dayText: { fontSize: 12 },
});

// ── 날짜·시간 행 ──────────────────────────
type PickerType = "date" | "time" | null;

interface DateTimeRowProps {
  label: string;
  date: Date;
  time: TimeState;
  openPicker: PickerType;
  onTogglePicker: (type: PickerType) => void;
  onDateChange: (d: Date) => void;
  onTimeChange: (t: TimeState) => void;
  isLast?: boolean;
}

function DateTimeRow({
  label, date, time, openPicker, onTogglePicker,
  onDateChange, onTimeChange, isLast,
}: DateTimeRowProps) {
  const C = useTheme();
  return (
    <>
      <View style={[rowStyles.row, isLast && { borderBottomWidth: 0 }, { borderBottomColor: C.border }]}>
        <Text style={[rowStyles.label, { color: C.textMuted }]}>{label}</Text>
        {/* 날짜 버튼 */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onTogglePicker(openPicker === "date" ? null : "date")}
          style={[
            rowStyles.pill,
            openPicker === "date" && { backgroundColor: C.primary + "18", borderColor: C.primary },
          ]}
        >
          <Text style={[rowStyles.pillText, { color: openPicker === "date" ? C.primary : C.text }]}>
            {formatDate(date)}
          </Text>
        </TouchableOpacity>
        {/* 시간 버튼 */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onTogglePicker(openPicker === "time" ? null : "time")}
          style={[
            rowStyles.pill,
            openPicker === "time" && { backgroundColor: C.primary + "18", borderColor: C.primary },
          ]}
        >
          <Text style={[rowStyles.pillText, { color: openPicker === "time" ? C.primary : C.text }]}>
            {formatTime(time.ampm, time.hour, time.minute)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 인라인 캘린더 */}
      {openPicker === "date" && (
        <InlineCalendar
          selected={date}
          onSelect={(d) => {
            onDateChange(d);
            onTogglePicker(null);
          }}
        />
      )}

      {/* 인라인 시간 피커 */}
      {openPicker === "time" && (
        <InlineTimePicker value={time} onChange={onTimeChange} />
      )}
    </>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  label: { fontSize: 14, fontWeight: "500", width: 44 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  pillText: { fontSize: 13, fontWeight: "500" },
});

// ── 프로젝트 선택기 ───────────────────────
interface ProjectSelectorProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function ProjectSelector({ selectedId, onSelect }: ProjectSelectorProps) {
  const C = useTheme();
  const { projects } = useProject();
  const [open, setOpen] = useState(false);
  const selected = projects.find(p => p.id === selectedId);

  return (
    <>
      {/* 선택 row */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setOpen(v => !v)}
        style={[projStyles.row, { borderBottomColor: C.border }]}
      >
        {/* 프로젝트 아바타 */}
        <View style={[
          projStyles.avatar,
          { backgroundColor: selected ? selected.color + "30" : C.bgMuted },
        ]}>
          {selected
            ? <Text style={projStyles.avatarEmoji}>{selected.emoji}</Text>
            : <View style={[projStyles.avatarDot, { backgroundColor: C.textMuted }]} />
          }
        </View>
        <Text style={[projStyles.name, { color: selected ? C.text : C.textMuted }]} numberOfLines={1}>
          {selected ? selected.name : "프로젝트를 선택하세요"}
        </Text>
        <ChevronDownIcon color={C.textMuted} />
      </TouchableOpacity>

      {/* 드롭다운 목록 */}
      {open && projects.map((p) => {
        const isSelected = p.id === selectedId;
        return (
          <TouchableOpacity
            key={p.id}
            activeOpacity={0.7}
            onPress={() => { onSelect(p.id); setOpen(false); }}
            style={[projStyles.dropRow, { borderBottomColor: C.border }]}
          >
            <View style={[projStyles.avatar, { backgroundColor: p.color + "30" }]}>
              <Text style={projStyles.avatarEmoji}>{p.emoji}</Text>
            </View>
            <Text style={[projStyles.name, { color: C.text, flex: 1 }]} numberOfLines={1}>
              {p.name}
            </Text>
            {isSelected ? (
              <View style={[projStyles.checkCircle, { backgroundColor: "#16A34A" }]}>
                <CheckIcon color="#fff" />
              </View>
            ) : (
              <View style={[projStyles.checkCircle, { borderWidth: 1.5, borderColor: C.border }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </>
  );
}

const projStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  dropRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarEmoji: { fontSize: 18 },
  avatarDot: { width: 12, height: 12, borderRadius: 6 },
  name: { fontSize: 14, fontWeight: "500", flex: 1 },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});

// ── 메인 화면 ──────────────────────────────
type TabType = "personal" | "project";

export default function AddTodoScreen() {
  const C = useTheme();
  const router = useRouter();
  const { projects } = useProject();
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const [tab, setTab] = useState<TabType>("personal");

  // 폼 상태
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<number>(2); // 1=하 2=중 3=상

  // 선택된 프로젝트의 멤버 목록
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectMembers = selectedProject?.members ?? [];

  // 프로젝트 바뀌면 담당자 선택 초기화
  useEffect(() => { setSelectedMemberIds([]); }, [selectedProjectId]);

  // 시작일/시간
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState<TimeState>({ ampm: 1, hour: 9, minute: 10 });
  const [startPicker, setStartPicker] = useState<PickerType>(null);

  // 종료일/시간
  const [endDate, setEndDate] = useState(nextMonth);
  const [endTime, setEndTime] = useState<TimeState>({ ampm: 1, hour: 9, minute: 10 });
  const [endPicker, setEndPicker] = useState<PickerType>(null);

  const toggleStartPicker = (type: PickerType) => {
    setEndPicker(null);
    setStartPicker(prev => (prev === type ? null : type));
  };
  const toggleEndPicker = (type: PickerType) => {
    setStartPicker(null);
    setEndPicker(prev => (prev === type ? null : type));
  };

  const canSave = title.trim().length > 0 && (tab === "personal" || !!selectedProjectId);

  // 로컬 날짜를 YYYY-MM-DD로 (toISOString은 UTC라 KST에서 하루 밀림)
  const toYmd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const handleSave = async () => {
    if (!canSave) return;
    await TodoAPI.create({
      title: title.trim(),
      description: description.trim() || undefined,
      project_id: tab === "project" ? selectedProjectId ?? undefined : undefined,
      assignee_member_ids: tab === "project" ? selectedMemberIds : [],
      due_date: toYmd(endDate),
      start_date: toYmd(startDate),
      difficulty,
    });
    router.back();
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      {/* 헤더 */}
      <View style={[s.header, { borderBottomColor: C.border, backgroundColor: C.bgCard }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={s.iconBtn}>
          <BackIcon color={C.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.text }]}>새로운 To-Do</Text>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
            <SearchIcon color={C.textSub} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.7}
            onPress={handleSave}
          >
            <PlusIcon color={canSave ? C.primary : C.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 탭 전환 */}
      <View style={[s.tabBar, { backgroundColor: C.bg }]}>
        <View style={[s.tabWrap, { backgroundColor: C.bgCard }]}>
          {(["personal", "project"] as TabType[]).map((t) => {
            const active = tab === t;
            const label = t === "personal" ? "개인 To-Do" : "프로젝트 To-Do";
            return (
              <TouchableOpacity
                key={t}
                activeOpacity={0.8}
                onPress={() => setTab(t)}
                style={[s.tabBtn, active && { backgroundColor: C.primary }]}
              >
                <Text style={[s.tabText, { color: active ? "#fff" : C.textMuted, fontWeight: active ? "700" : "500" }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 폼 카드 */}
        <View style={[s.card, { backgroundColor: C.bgCard, borderColor: C.border }]}>

          {/* 프로젝트 선택 (프로젝트 탭에서만) */}
          {tab === "project" && (
            <ProjectSelector
              selectedId={selectedProjectId}
              onSelect={setSelectedProjectId}
            />
          )}

          {/* 담당자 선택 (프로젝트 선택 시) */}
          {tab === "project" && selectedProjectId && projectMembers.length > 0 && (
            <View style={[s.assigneeSection, { borderBottomColor: C.border }]}>
              <Text style={[s.assigneeLabel, { color: C.textMuted }]}>담당자</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.assigneeRow}
                keyboardShouldPersistTaps="handled"
              >
                {projectMembers.map((m) => {
                  const active = selectedMemberIds.includes(m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      activeOpacity={0.7}
                      onPress={() => setSelectedMemberIds(prev =>
                        prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                      )}
                      style={[
                        s.assigneeChip,
                        { borderColor: C.border },
                        active && { backgroundColor: C.primary, borderColor: C.primary },
                      ]}
                    >
                      <Text style={[
                        s.assigneeChipText,
                        { color: active ? "#fff" : C.text },
                      ]}>{m.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* 제목 */}
          <TextInput
            style={[s.titleInput, { color: C.text, borderBottomColor: C.border }]}
            placeholder="제목"
            placeholderTextColor={C.textMuted}
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
          />

          {/* 설명 */}
          <View style={[s.descRow, { borderBottomColor: C.border }]}>
            <NoteIcon color={C.textMuted} />
            <TextInput
              style={[s.descInput, { color: C.text }]}
              placeholder="설명"
              placeholderTextColor={C.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          {/* 난이도 */}
          <View style={[s.assigneeSection, { borderBottomColor: C.border }]}>
            <Text style={[s.assigneeLabel, { color: C.textMuted }]}>난이도</Text>
            <View style={[s.assigneeRow, { flexDirection: "row" }]}>
              {[
                { v: 1, label: "하" },
                { v: 2, label: "중" },
                { v: 3, label: "상" },
              ].map((d) => {
                const active = difficulty === d.v;
                return (
                  <TouchableOpacity
                    key={d.v}
                    activeOpacity={0.7}
                    onPress={() => setDifficulty(d.v)}
                    style={[
                      s.assigneeChip,
                      { borderColor: C.border },
                      active && { backgroundColor: C.primary, borderColor: C.primary },
                    ]}
                  >
                    <Text style={[
                      s.assigneeChipText,
                      { color: active ? "#fff" : C.text },
                    ]}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 시작일 */}
          <DateTimeRow
            label="시작일"
            date={startDate}
            time={startTime}
            openPicker={startPicker}
            onTogglePicker={toggleStartPicker}
            onDateChange={setStartDate}
            onTimeChange={setStartTime}
          />

          {/* 종료일 */}
          <DateTimeRow
            label="종료일"
            date={endDate}
            time={endTime}
            openPicker={endPicker}
            onTogglePicker={toggleEndPicker}
            onDateChange={setEndDate}
            onTimeChange={setEndTime}
            isLast
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  // 헤더
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "600", textAlign: "center" },
  headerRight: { flexDirection: "row" },
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  // 탭
  tabBar: { paddingHorizontal: 20, paddingVertical: 14 },
  tabWrap: {
    flexDirection: "row",
    borderRadius: 50,
    padding: 4,
    gap: 2,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: { fontSize: 14 },

  // 바디
  body: { paddingHorizontal: 20, paddingBottom: 40 },

  // 카드
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    overflow: "hidden",
  },

  // 제목
  titleInput: {
    fontSize: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },

  // 설명
  descRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  descInput: {
    flex: 1,
    fontSize: 14,
    minHeight: 20,
    padding: 0,
    paddingTop: Platform.OS === "ios" ? 0 : 2,
  },

  // 담당자 선택
  assigneeSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  assigneeLabel: { fontSize: 14, fontWeight: "500" },
  assigneeRow: { gap: 8, paddingRight: 4 },
  assigneeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  assigneeChipText: { fontSize: 13, fontWeight: "600" },
});
